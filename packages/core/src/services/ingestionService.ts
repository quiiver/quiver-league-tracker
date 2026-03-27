import { Prisma, PrismaClient } from '@prisma/client';
import type { Archer as PrismaArcher, EventScore } from '@prisma/client';
import { addMilliseconds } from 'date-fns';
import { getCoreConfig } from '../config';
import { getPrismaClient } from '../db/client';
import { ResultsApiClient } from '../http/resultsApiClient';
import { EventResponse } from '../http/types';
import { logger } from '../logger';
import { parseScoreString } from '../scoring/scoreParser';
import { assignCompetitionRanking } from '../utils/ranking';

type TransactionClient = PrismaClient | Prisma.TransactionClient;

type ConstructorOptions = {
  prisma?: PrismaClient;
  apiClient?: ResultsApiClient;
  scoringRule?: number;
  canonicalOverrides?: Record<number, number>;
};

export interface SyncEventResult {
  eventId: number;
  participants: number;
  scores: number;
  syncedAt: Date;
}

export interface SyncTournamentResult {
  tournamentId: number;
  eventIds: number[];
  syncedAt: Date;
}

export interface DeleteTournamentResult {
  tournamentId: number;
  existed: boolean;
  deletedEvents: number;
  deletedCategories: number;
  deletedParticipants: number;
  deletedScores: number;
  deletedTournament: number;
}

export class IngestionService {
  private readonly prisma: PrismaClient;
  private readonly apiClient: ResultsApiClient;
  private readonly scoringRule: number;
  private readonly canonicalOverrides: Readonly<Record<number, number>>;

  constructor(options: ConstructorOptions = {}) {
    const config = getCoreConfig();
    this.prisma = options.prisma ?? getPrismaClient();
    this.apiClient = options.apiClient ?? new ResultsApiClient({ baseUrl: config.resultsApiBaseUrl });
    this.scoringRule = options.scoringRule ?? config.scoringRule;
    this.canonicalOverrides = options.canonicalOverrides ?? {};
  }

  async syncTournament(tournamentId: number): Promise<SyncTournamentResult> {
    const tournament = await this.apiClient.getTournament(tournamentId);
    const syncedAt = new Date();

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.tournament.upsert({
        where: { id: tournament.id },
        update: {
          name: tournament.tournament_name,
          location: tournament.location,
          startDate: toDate(tournament.start_date),
          endDate: toDate(tournament.end_date),
          updatedAt: toDate(tournament.updated_at),
          lastSyncedAt: syncedAt
        },
        create: {
          id: tournament.id,
          name: tournament.tournament_name,
          location: tournament.location,
          startDate: toDate(tournament.start_date),
          endDate: toDate(tournament.end_date),
          updatedAt: toDate(tournament.updated_at),
          lastSyncedAt: syncedAt
        }
      });

      for (const eventSummary of tournament.events) {
        await tx.event.upsert({
          where: { id: eventSummary.id },
          update: {
            name: eventSummary.event_name,
            eventType: eventSummary.event_type ?? undefined,
            displayOrder: eventSummary.display_order ?? undefined,
            tournamentId: tournament.id,
            updatedAt: syncedAt
          },
          create: {
            id: eventSummary.id,
            name: eventSummary.event_name,
            eventType: eventSummary.event_type ?? undefined,
            displayOrder: eventSummary.display_order ?? undefined,
            tournamentId: tournament.id,
            updatedAt: syncedAt,
            lastSyncedAt: null
          }
        });
      }
    });

    for (const eventSummary of tournament.events) {
      try {
        await this.syncEvent(eventSummary.id, { tournamentId: tournament.id });
      } catch (error) {
        logger.error({ error, eventId: eventSummary.id }, 'failed to sync event');
      }
    }

    const eventIds = tournament.events.map((eventSummary) => eventSummary.id);

    return { tournamentId: tournament.id, eventIds, syncedAt };
  }

  async syncEvent(eventId: number, options: { tournamentId?: number } = {}): Promise<SyncEventResult> {
    const syncedAt = new Date();
    const [eventPayload, scoresPayload] = await Promise.all([
      this.apiClient.getEvent(eventId),
      this.apiClient.getScores(eventId)
    ]);

    const existingEvent = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!existingEvent && !options.tournamentId) {
      throw new Error(
        `event ${eventId} is not associated with a tournament. Provide tournamentId or sync the tournament first.`
      );
    }

    const tournamentId = existingEvent?.tournamentId ?? options.tournamentId;

    const prismaResult = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (!tournamentId) {
        throw new Error('tournamentId is required to sync this event');
      }

      const eventRecord = await tx.event.upsert({
        where: { id: eventId },
        update: {
          name: eventPayload.enm,
          eventType: eventPayload.etp ?? undefined,
          displayOrder: eventPayload.dor ?? undefined,
          updatedAt: syncedAt,
          lastSyncedAt: syncedAt,
          tournamentId
        },
        create: {
          id: eventId,
          name: eventPayload.enm,
          eventType: eventPayload.etp ?? undefined,
          displayOrder: eventPayload.dor ?? undefined,
          updatedAt: syncedAt,
          lastSyncedAt: syncedAt,
          tournamentId
        }
      });

      const categoryMap = await this.upsertCategories(tx, eventRecord.id, eventPayload);
      const participantMap = await this.upsertParticipants(tx, eventRecord.id, eventPayload, categoryMap);
      const scoreCount = await this.upsertScores(tx, eventRecord.id, scoresPayload.ars, participantMap);

      await this.updateRankings(tx, eventRecord.id);

      return {
        participants: participantMap.size,
        scores: scoreCount
      };
    });

    logger.info({ eventId, ...prismaResult }, 'event sync complete');

    return {
      eventId,
      participants: prismaResult.participants,
      scores: prismaResult.scores,
      syncedAt
    };
  }

  async deleteTournament(tournamentId: number): Promise<DeleteTournamentResult> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingTournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true }
      });

      if (!existingTournament) {
        return {
          tournamentId,
          existed: false,
          deletedEvents: 0,
          deletedCategories: 0,
          deletedParticipants: 0,
          deletedScores: 0,
          deletedTournament: 0
        };
      }

      const events = await tx.event.findMany({
        where: { tournamentId },
        select: { id: true }
      });
      const eventIds = events.map((event) => event.id);

      const [scoresResult, participantsResult, categoriesResult] = await Promise.all([
        tx.eventScore.deleteMany({ where: { eventId: { in: eventIds } } }),
        tx.eventParticipant.deleteMany({ where: { eventId: { in: eventIds } } }),
        tx.eventCategory.deleteMany({ where: { eventId: { in: eventIds } } })
      ]);

      const eventsResult = await tx.event.deleteMany({ where: { tournamentId } });
      const tournamentResult = await tx.tournament.deleteMany({ where: { id: tournamentId } });

      logger.info(
        {
          tournamentId,
          deletedTournament: tournamentResult.count,
          deletedEvents: eventsResult.count,
          deletedCategories: categoriesResult.count,
          deletedParticipants: participantsResult.count,
          deletedScores: scoresResult.count
        },
        'tournament deleted'
      );

      return {
        tournamentId,
        existed: true,
        deletedEvents: eventsResult.count,
        deletedCategories: categoriesResult.count,
        deletedParticipants: participantsResult.count,
        deletedScores: scoresResult.count,
        deletedTournament: tournamentResult.count
      };
    });
  }

  private async upsertCategories(
    tx: TransactionClient,
    eventId: number,
    payload: EventResponse
  ): Promise<Map<string, number>> {
    const categoryNameToId = new Map<string, number>();
    const activeCategoryIds: number[] = [];

    for (const category of payload.cgs) {
      const record = await tx.eventCategory.upsert({
        where: { eventId_name: { eventId, name: category.nm } },
        update: {
          displayOrder: category.dor ?? undefined,
          cut: category.cut ?? undefined
        },
        create: {
          eventId,
          name: category.nm,
          displayOrder: category.dor ?? undefined,
          cut: category.cut ?? undefined
        }
      });

      activeCategoryIds.push(record.id);
      categoryNameToId.set(category.nm, record.id);
    }

    if (payload.cgs.length === 0) {
      await tx.eventCategory.deleteMany({ where: { eventId } });
    } else {
      await tx.eventCategory.deleteMany({ where: { eventId, id: { notIn: activeCategoryIds } } });
    }

    return categoryNameToId;
  }

  private async upsertParticipants(
    tx: TransactionClient,
    eventId: number,
    payload: EventResponse,
    categoryLookup: Map<string, number>
  ): Promise<Map<number, number>> {
    const participantCategoryMap = new Map<number, number>();
    const activeArcherIds: number[] = [];
    const canonicalCache = new Map<string, number>();

    const participantEntries = Object.entries(payload.rps) as Array<
      [string, EventResponse['rps'][string]]
    >;

    for (const [archerIdKey, participant] of participantEntries) {
      const archerId = Number.parseInt(archerIdKey, 10);
      const metaPayload = {
        targetAssignments: participant.tgt ?? [],
        tournamentLines: participant.tnl ?? [],
        rating: participant.rtl ?? null,
        tieBreakSource: participant.tbs ?? null
      };
      const serializedMeta = JSON.stringify(metaPayload);
      const archerRecord = await tx.archer.upsert({
        where: { id: archerId },
        update: {
          firstName: participant.fnm,
          lastName: participant.lnm,
          conditionCode: participant.cnd ?? undefined,
          team: participant.tm ?? undefined,
          alias: participant.alt ?? undefined,
          meta: serializedMeta
        },
        create: {
          id: archerId,
          firstName: participant.fnm,
          lastName: participant.lnm,
          conditionCode: participant.cnd ?? undefined,
          team: participant.tm ?? undefined,
          alias: participant.alt ?? undefined,
          meta: serializedMeta
        }
      });

      await this.ensureCanonicalArcherLink(tx, {
        archer: archerRecord,
        normalizedKeyCache: canonicalCache
      });

      const categoryId = findCategoryIdForArcher(archerId, payload, categoryLookup);
      participantCategoryMap.set(archerId, categoryId);
      activeArcherIds.push(archerId);

      await tx.eventParticipant.upsert({
        where: { eventId_archerId: { eventId, archerId } },
        update: { categoryId },
        create: { eventId, archerId, categoryId }
      });
    }

    if (activeArcherIds.length === 0) {
      await tx.eventParticipant.deleteMany({ where: { eventId } });
    } else {
      await tx.eventParticipant.deleteMany({
        where: {
          eventId,
          archerId: { notIn: activeArcherIds }
        }
      });
    }

    return participantCategoryMap;
  }

  private async upsertScores(
    tx: TransactionClient,
    eventId: number,
    scores: Record<string, string>,
    participantCategoryMap: Map<number, number>
  ): Promise<number> {
    let processed = 0;
    const activeArcherIds: number[] = [];

    const scoreEntries = Object.entries(scores) as Array<[string, string]>;

    for (const [archerIdKey, rawScore] of scoreEntries) {
      const archerId = Number.parseInt(archerIdKey, 10);
      const breakdown = parseScoreString(rawScore, this.scoringRule);
      const categoryId = participantCategoryMap.get(archerId) ?? null;
      const serializedTieBreak = breakdown.tieBreak.length > 0 ? JSON.stringify(breakdown.tieBreak) : null;

      await tx.eventScore.upsert({
        where: { eventId_archerId: { eventId, archerId } },
        update: {
          rawScore: breakdown.sanitized,
          total: breakdown.total,
          tens: breakdown.tens,
          xCount: breakdown.xCount,
          nines: breakdown.nines,
          arrows: breakdown.arrows,
          tieBreak: serializedTieBreak,
          scoringRule: breakdown.scoringRule,
          categoryId: categoryId ?? undefined,
          computedAt: new Date()
        },
        create: {
          eventId,
          archerId,
          categoryId: categoryId ?? undefined,
          rawScore: breakdown.sanitized,
          total: breakdown.total,
          tens: breakdown.tens,
          xCount: breakdown.xCount,
          nines: breakdown.nines,
          arrows: breakdown.arrows,
          tieBreak: serializedTieBreak,
          scoringRule: breakdown.scoringRule
        }
      });

      processed += 1;
      activeArcherIds.push(archerId);
    }

    if (activeArcherIds.length === 0) {
      await tx.eventScore.deleteMany({ where: { eventId } });
    } else {
      await tx.eventScore.deleteMany({
        where: {
          eventId,
          archerId: { notIn: activeArcherIds }
        }
      });
    }

    return processed;
  }

  private async updateRankings(tx: TransactionClient, eventId: number): Promise<void> {
    const scores = await tx.eventScore.findMany({ where: { eventId } });
    const byCategory = new Map<number, EventScore[]>();

    for (const score of scores) {
      if (!score.categoryId) {
        continue;
      }
      if (!byCategory.has(score.categoryId)) {
        byCategory.set(score.categoryId, []);
      }
      byCategory.get(score.categoryId)!.push(score);
    }

    for (const [, categoryScores] of byCategory.entries()) {
      const ranked = assignCompetitionRanking<EventScore>(categoryScores, (entry) => entry);
      for (const { item, rank } of ranked) {
        await tx.eventScore.update({
          where: { eventId_archerId: { eventId, archerId: item.archerId } },
          data: { ranking: rank }
        });
      }
    }
  }

  private async ensureCanonicalArcherLink(
    tx: TransactionClient,
    options: {
      archer: Pick<PrismaArcher, 'id' | 'canonicalArcherId' | 'firstName' | 'lastName' | 'team'>;
      normalizedKeyCache: Map<string, number>;
    }
  ): Promise<number | null> {
    const { archer, normalizedKeyCache } = options;

    if (this.canonicalOverrides[archer.id]) {
      const canonicalId = this.canonicalOverrides[archer.id];
      const canonical = await tx.canonicalArcher.findUnique({ where: { id: canonicalId } });
      if (!canonical) {
        throw new Error(`canonical override ${canonicalId} for archer ${archer.id} does not exist`);
      }
      if (archer.canonicalArcherId !== canonicalId) {
        logger.debug(
          {
            archerId: archer.id,
            fromCanonicalArcherId: archer.canonicalArcherId,
            toCanonicalArcherId: canonicalId,
            normalizedKey: canonical.normalizedKey,
            reason: 'manual-override'
          },
          'merging archer profile'
        );
        await tx.archer.update({
          where: { id: archer.id },
          data: {
            canonicalArcherId: canonicalId,
            canonicalLinkMethod: 'manual_override',
            canonicalLinkUpdatedAt: new Date()
          }
        });
      }
      return canonicalId;
    }

    if (!archer.firstName && !archer.lastName) {
      return archer.canonicalArcherId ?? null;
    }

    const normalizedKey = buildCanonicalKey(archer.firstName, archer.lastName);

    if (normalizedKeyCache.has(normalizedKey)) {
      const canonicalId = normalizedKeyCache.get(normalizedKey)!;
      if (archer.canonicalArcherId !== canonicalId) {
        logger.debug(
          {
            archerId: archer.id,
            fromCanonicalArcherId: archer.canonicalArcherId,
            toCanonicalArcherId: canonicalId,
            normalizedKey,
            reason: 'normalized-key-cache'
          },
          'merging archer profile'
        );
        await tx.archer.update({
          where: { id: archer.id },
          data: {
            canonicalArcherId: canonicalId,
            canonicalLinkMethod: 'auto_name_match',
            canonicalLinkUpdatedAt: new Date()
          }
        });
      }
      return canonicalId;
    }

    let canonical = await tx.canonicalArcher.findUnique({ where: { normalizedKey } });

    if (!canonical) {
      canonical = await tx.canonicalArcher.create({
        data: {
          normalizedKey,
          primaryFirstName: stripParenthetical(archer.firstName),
          primaryLastName: stripParenthetical(archer.lastName),
          primaryTeam: archer.team ?? null
        }
      });
    }

    normalizedKeyCache.set(normalizedKey, canonical.id);

    const updatePayload: {
      primaryFirstName?: string | null;
      primaryLastName?: string | null;
      primaryTeam?: string | null;
    } = {};

    const cleanFirstName = stripParenthetical(archer.firstName);
    const cleanLastName = stripParenthetical(archer.lastName);

    if (!canonical.primaryFirstName && cleanFirstName) {
      updatePayload.primaryFirstName = cleanFirstName;
    }
    if (!canonical.primaryLastName && cleanLastName) {
      updatePayload.primaryLastName = cleanLastName;
    }
    if (archer.team && (!canonical.primaryTeam || canonical.primaryTeam.length < archer.team.length)) {
      updatePayload.primaryTeam = archer.team;
    }

    if (Object.keys(updatePayload).length > 0) {
      canonical = await tx.canonicalArcher.update({
        where: { id: canonical.id },
        data: updatePayload
      });
    }

    if (archer.canonicalArcherId !== canonical.id) {
      logger.debug(
        {
          archerId: archer.id,
          fromCanonicalArcherId: archer.canonicalArcherId,
          toCanonicalArcherId: canonical.id,
          normalizedKey,
          reason: 'normalized-key-match'
        },
        'merging archer profile'
      );
      await tx.archer.update({
        where: { id: archer.id },
        data: {
          canonicalArcherId: canonical.id,
          canonicalLinkMethod: 'auto_name_match',
          canonicalLinkUpdatedAt: new Date()
        }
      });
    }

    return canonical.id;
  }
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  // Normalize to UTC midnight if the source date has no timezone info.
  return addMilliseconds(parsed, -parsed.getTimezoneOffset() * 60 * 1000);
}

function findCategoryIdForArcher(
  archerId: number,
  payload: EventResponse,
  categoryLookup: Map<string, number>
): number {
  for (const category of payload.cgs) {
    for (const assignment of category.ars) {
      if (assignment.aid === archerId) {
        const resolved = categoryLookup.get(category.nm);
        if (!resolved) {
          throw new Error(`category ${category.nm} was not persisted for event`);
        }
        return resolved;
      }
    }
  }

  throw new Error(`no category found for archer ${archerId}`);
}

function normalizeComponent(value: string | null): string {
  if (!value) {
    return '';
  }

  // Drop category suffixes like " (C)" before normalizing.
  const withoutParenthetical = value.replace(/\([^)]*\)/g, ' ');

  return withoutParenthetical
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function stripParenthetical(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || null;
}

function buildCanonicalKey(firstName: string | null, lastName: string | null): string {
  const normalizedFirst = normalizeComponent(firstName);
  const normalizedLast = normalizeComponent(lastName);

  return `${normalizedFirst}|${normalizedLast}`;
}
