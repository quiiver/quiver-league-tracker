import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../db/client';
import { assignCompetitionRanking } from '../utils/ranking';
import type { ScoreLike } from '../utils/ranking';
import {
  ArcherProfileResponse,
  EventLeaderboardResponse,
  LeaderboardEntry,
  TournamentLeaderboardResponse
} from './types';

interface AggregatedRow extends ScoreLike {
  archerId: number;
  firstName: string;
  lastName: string;
  conditionCode: string | null;
  team: string | null;
  total: number;
  tens: number;
  xCount: number;
  nines: number;
  arrows: number;
  latestCategory: string | null;
  breakdown: LeaderboardEntry['breakdown'];
}

export class LeaderboardService {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  async getTournamentLeaderboard(tournamentId: number): Promise<TournamentLeaderboardResponse> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        events: {
          orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
          include: {
            scores: {
              include: {
                archer: true,
                category: true
              },
              orderBy: [
                { total: 'desc' as const },
                { tens: 'desc' as const },
                { xCount: 'desc' as const },
                { nines: 'desc' as const }
              ]
            }
          }
        }
      }
    });

    if (!tournament) {
      throw new Error(`tournament ${tournamentId} was not found`);
    }

    const aggregateMap = new Map<number, AggregatedRow>();

    for (const event of tournament.events) {
      for (const score of event.scores) {
        let existing = aggregateMap.get(score.archerId);
        if (!existing) {
          existing = {
            archerId: score.archerId,
            firstName: score.archer.firstName,
            lastName: score.archer.lastName,
            conditionCode: score.archer.conditionCode ?? null,
            team: score.archer.team ?? null,
            total: 0,
            tens: 0,
            xCount: 0,
            nines: 0,
            arrows: 0,
            latestCategory: null,
            breakdown: []
          } satisfies AggregatedRow;
          aggregateMap.set(score.archerId, existing);
        }

        existing.total += score.total;
        existing.tens += score.tens;
        existing.xCount += score.xCount;
        existing.nines += score.nines;
        existing.arrows += score.arrows;
        existing.latestCategory = score.category?.name ?? existing.latestCategory;

        const previous = existing.breakdown.at(-1) ?? null;
        const tieBreak = coerceTieBreak(score.tieBreak);
        const breakdownEntry = {
          eventId: score.eventId,
          eventName: event.name,
          displayOrder: event.displayOrder ?? null,
          ranking: score.ranking ?? null,
          categoryName: score.category?.name ?? null,
          deltaFromPrevious: previous ? score.total - previous.total : null,
          rankingDelta:
            previous && previous.ranking !== null && score.ranking !== null
              ? previous.ranking - score.ranking
              : null,
          tieBreak,
          rawScore: score.rawScore,
          syncedAt: event.lastSyncedAt,
          total: score.total,
          tens: score.tens,
          xCount: score.xCount,
          nines: score.nines,
          arrows: score.arrows
        } satisfies LeaderboardEntry['breakdown'][number];

        existing.breakdown = [...existing.breakdown, breakdownEntry];
      }
    }

    const aggregateRows = Array.from(aggregateMap.values());
    const ranked = assignCompetitionRanking<AggregatedRow>(aggregateRows, (entry) => entry);

    const leaderboard: LeaderboardEntry[] = ranked.map(({ item, rank }) => {
      const eventsShot = item.breakdown.length;
      const best =
        eventsShot > 0 ? Math.max(...item.breakdown.map(({ total }) => total)) : 0;
      const worst =
        eventsShot > 0 ? Math.min(...item.breakdown.map(({ total }) => total)) : 0;
      const average = eventsShot > 0 ? item.total / eventsShot : 0;
      const latest = item.breakdown.at(-1) ?? null;

      return {
        archerId: item.archerId,
        fullName: `${item.firstName} ${item.lastName}`.trim(),
        conditionCode: item.conditionCode,
        team: item.team,
        totals: {
          total: item.total,
          tens: item.tens,
          xCount: item.xCount,
          nines: item.nines,
          arrows: item.arrows
        },
        eventsShot,
        average,
        best,
        worst,
        trend: latest?.deltaFromPrevious ?? null,
        latestRanking: latest?.ranking ?? null,
        latestCategory: latest?.categoryName ?? item.latestCategory,
        breakdown: item.breakdown,
        rank
      };
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        location: tournament.location ?? null,
        startDate: tournament.startDate ?? null,
        endDate: tournament.endDate ?? null,
        lastSyncedAt: tournament.lastSyncedAt ?? null,
        events: tournament.events.map(
          (eventRecord: (typeof tournament.events)[number]) => ({
            id: eventRecord.id,
            name: eventRecord.name,
            displayOrder: eventRecord.displayOrder ?? null,
            lastSyncedAt: eventRecord.lastSyncedAt ?? null
          })
        )
      },
      leaderboard
    };
  }

  async getEventLeaderboard(eventId: number): Promise<EventLeaderboardResponse> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tournament: true,
        categories: true,
        scores: {
          include: {
            archer: true,
            category: true
          },
          orderBy: [
            { total: 'desc' as const },
            { tens: 'desc' as const },
            { xCount: 'desc' as const },
            { nines: 'desc' as const }
          ]
        }
      }
    });

    if (!event) {
      throw new Error(`event ${eventId} was not found`);
    }

    const categories = event.categories.map(
      (categoryRecord: (typeof event.categories)[number]) => ({
        categoryId: categoryRecord.id,
        categoryName: categoryRecord.name,
        scores: event.scores
          .filter(
            (scoreRecord: (typeof event.scores)[number]) => scoreRecord.categoryId === categoryRecord.id
          )
          .map((scoreRecord: (typeof event.scores)[number]) => ({
            archerId: scoreRecord.archerId,
            fullName: `${scoreRecord.archer.firstName} ${scoreRecord.archer.lastName}`.trim(),
            total: scoreRecord.total,
            tens: scoreRecord.tens,
            xCount: scoreRecord.xCount,
            nines: scoreRecord.nines,
            arrows: scoreRecord.arrows,
            ranking: scoreRecord.ranking ?? null,
            tieBreak: coerceTieBreak(scoreRecord.tieBreak),
            rawScore: scoreRecord.rawScore
          }))
      })
    );

    return {
      event: {
        id: event.id,
        name: event.name,
        displayOrder: event.displayOrder ?? null,
        tournamentId: event.tournamentId,
        tournamentName: event.tournament?.name ?? null,
        lastSyncedAt: event.lastSyncedAt ?? null
      },
      categories
    };
  }

  async getArcherProfile(archerId: number, tournamentId?: number): Promise<ArcherProfileResponse> {
    const archer = await this.prisma.archer.findUnique({
      where: { id: archerId },
      include: {
        scores: {
          include: {
            event: {
              include: { tournament: true }
            },
            category: true
          },
          orderBy: [
            { event: { displayOrder: 'asc' as const } },
            { eventId: 'asc' as const }
          ]
        }
      }
    });

    if (!archer) {
      throw new Error(`archer ${archerId} was not found`);
    }

    const filteredScores = archer.scores.filter(
      (scoreRecord: (typeof archer.scores)[number]) =>
        tournamentId ? scoreRecord.event.tournamentId === tournamentId : true
    );

    const totals = filteredScores.reduce(
      (
        accumulator: {
          total: number;
          tens: number;
          xCount: number;
          nines: number;
          arrows: number;
        },
        scoreRecord: (typeof filteredScores)[number]
      ) => {
        accumulator.total += scoreRecord.total;
        accumulator.tens += scoreRecord.tens;
        accumulator.xCount += scoreRecord.xCount;
        accumulator.nines += scoreRecord.nines;
        accumulator.arrows += scoreRecord.arrows;
        return accumulator;
      },
      { total: 0, tens: 0, xCount: 0, nines: 0, arrows: 0 }
    );

    const events = filteredScores.map((scoreRecord: (typeof filteredScores)[number]) => ({
      eventId: scoreRecord.eventId,
      eventName: scoreRecord.event.name,
      tournamentId: scoreRecord.event.tournamentId,
      tournamentName: scoreRecord.event.tournament?.name ?? '',
      total: scoreRecord.total,
      ranking: scoreRecord.ranking ?? null,
      categoryName: scoreRecord.category?.name ?? null,
      tieBreak: coerceTieBreak(scoreRecord.tieBreak),
      rawScore: scoreRecord.rawScore,
      arrows: scoreRecord.arrows
    }));

    const eventsShot = events.length;
    const average = eventsShot > 0 ? totals.total / eventsShot : 0;

    return {
      archer: {
        id: archer.id,
        firstName: archer.firstName,
        lastName: archer.lastName,
        conditionCode: archer.conditionCode ?? null,
        team: archer.team ?? null,
        alias: archer.alias ?? null
      },
      totals: {
        ...totals,
        eventsShot,
        average
      },
      events
    };
  }
}

function coerceTieBreak(value: string | null): Array<{ label: string; value: number }> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const entries = parsed
      .map((entry) => {
        if (
          typeof entry === 'object' &&
          entry !== null &&
          'label' in entry &&
          'value' in entry &&
          typeof entry.label === 'string'
        ) {
          return {
            label: entry.label as string,
            value: Number(entry.value)
          };
        }
        return null;
      })
      .filter((entry): entry is { label: string; value: number } => entry !== null);

    return entries.length > 0 ? entries : null;
  } catch (error) {
    return null;
  }
}
