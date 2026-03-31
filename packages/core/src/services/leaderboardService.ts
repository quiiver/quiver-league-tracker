import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../db/client';
import { assignCompetitionRanking } from '../utils/ranking';
import type { ScoreLike } from '../utils/ranking';
import {
  ArcherProfileResponse,
  CanonicalArcherProfileResponse,
  EventLeaderboardResponse,
  ScoreSummary,
  LeaderboardEntry,
  TournamentLeaderboardResponse
} from './types';

interface AggregatedRow extends ScoreLike {
  primaryArcherId: number;
  canonicalArcherId: number | null;
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
                archer: {
                  include: {
                    canonicalArcher: true
                  }
                },
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
        const groupingKey = score.archer.canonicalArcherId ?? score.archerId;
        let existing = aggregateMap.get(groupingKey);

        if (!existing) {
          const canonical = score.archer.canonicalArcher;
          const displayFirstName = canonical?.primaryFirstName ?? score.archer.firstName;
          const displayLastName = canonical?.primaryLastName ?? score.archer.lastName;
          const displayTeam = canonical?.primaryTeam ?? score.archer.team ?? null;

          existing = {
            primaryArcherId: score.archerId,
            canonicalArcherId: score.archer.canonicalArcherId ?? null,
            firstName: displayFirstName,
            lastName: displayLastName,
            conditionCode: score.archer.conditionCode ?? null,
            team: displayTeam,
            total: 0,
            tens: 0,
            xCount: 0,
            nines: 0,
            arrows: 0,
            latestCategory: null,
            breakdown: []
          } satisfies AggregatedRow;
          aggregateMap.set(groupingKey, existing);
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
      const best = eventsShot > 0 ? Math.max(...item.breakdown.map(({ total }) => total)) : 0;
      const worst = eventsShot > 0 ? Math.min(...item.breakdown.map(({ total }) => total)) : 0;
      const average = eventsShot > 0 ? item.total / eventsShot : 0;
      const latest = item.breakdown.at(-1) ?? null;

      return {
        archerId: item.primaryArcherId,
        canonicalArcherId: item.canonicalArcherId,
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
      } satisfies LeaderboardEntry;
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        location: tournament.location ?? null,
        startDate: tournament.startDate ?? null,
        endDate: tournament.endDate ?? null,
        lastSyncedAt: tournament.lastSyncedAt ?? null,
        events: tournament.events.map((eventRecord) => ({
          id: eventRecord.id,
          name: eventRecord.name,
          displayOrder: eventRecord.displayOrder ?? null,
          lastSyncedAt: eventRecord.lastSyncedAt ?? null
        }))
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
            archer: {
              include: {
                canonicalArcher: true
              }
            },
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

    const categories = event.categories.map((categoryRecord) => ({
      categoryId: categoryRecord.id,
      categoryName: categoryRecord.name,
      scores: event.scores
        .filter((scoreRecord) => scoreRecord.categoryId === categoryRecord.id)
        .map((scoreRecord) => {
          const canonical = scoreRecord.archer.canonicalArcher;
          const displayFirstName = canonical?.primaryFirstName ?? scoreRecord.archer.firstName;
          const displayLastName = canonical?.primaryLastName ?? scoreRecord.archer.lastName;

          return {
            archerId: scoreRecord.archerId,
            canonicalArcherId: scoreRecord.archer.canonicalArcherId ?? null,
            fullName: `${displayFirstName} ${displayLastName}`.trim(),
            total: scoreRecord.total,
            tens: scoreRecord.tens,
            xCount: scoreRecord.xCount,
            nines: scoreRecord.nines,
            arrows: scoreRecord.arrows,
            ranking: scoreRecord.ranking ?? null,
            tieBreak: coerceTieBreak(scoreRecord.tieBreak),
            rawScore: scoreRecord.rawScore
          };
        })
    }));

    return {
      event: {
        id: event.id,
        name: event.name,
        displayOrder: event.displayOrder ?? null,
        tournamentId: event.tournamentId,
        tournamentName: event.tournament?.name ?? null,
        roundsCount: event.roundsCount ?? null,
        endsPerRound: event.endsPerRound ?? null,
        arrowsPerEnd: event.arrowsPerEnd ?? null,
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

    const filteredScores = archer.scores.filter((scoreRecord) =>
      tournamentId ? scoreRecord.event.tournamentId === tournamentId : true
    );

    const totals = filteredScores.reduce(
      (accumulator, scoreRecord) => {
        accumulator.total += scoreRecord.total;
        accumulator.tens += scoreRecord.tens;
        accumulator.xCount += scoreRecord.xCount;
        accumulator.nines += scoreRecord.nines;
        accumulator.arrows += scoreRecord.arrows;
        return accumulator;
      },
      { total: 0, tens: 0, xCount: 0, nines: 0, arrows: 0 }
    );

    const events = filteredScores.map((scoreRecord) => ({
      eventId: scoreRecord.eventId,
      eventName: scoreRecord.event.name,
      tournamentId: scoreRecord.event.tournamentId,
      tournamentName: scoreRecord.event.tournament?.name ?? '',
      tournamentStartDate: scoreRecord.event.tournament?.startDate ?? null,
      roundsCount: scoreRecord.event.roundsCount ?? null,
      endsPerRound: scoreRecord.event.endsPerRound ?? null,
      arrowsPerEnd: scoreRecord.event.arrowsPerEnd ?? null,
      canonicalArcherId: archer.canonicalArcherId ?? null,
      total: scoreRecord.total,
      tens: scoreRecord.tens,
      xCount: scoreRecord.xCount,
      nines: scoreRecord.nines,
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
        canonicalArcherId: archer.canonicalArcherId ?? null,
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

  async getCanonicalArcherProfile(
    canonicalArcherId: number
  ): Promise<CanonicalArcherProfileResponse> {
    const canonical = await this.prisma.canonicalArcher.findUnique({
      where: { id: canonicalArcherId },
      include: {
        archers: {
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
        }
      }
    });

    if (!canonical) {
      throw new Error(`canonical archer ${canonicalArcherId} was not found`);
    }

    const linkedArchers = canonical.archers.map((archerRecord) => ({
      id: archerRecord.id,
      firstName: archerRecord.firstName,
      lastName: archerRecord.lastName,
      team: archerRecord.team ?? null,
      conditionCode: archerRecord.conditionCode ?? null,
      canonicalLinkMethod: archerRecord.canonicalLinkMethod ?? null,
      eventsShot: archerRecord.scores.length
    }));

    const allScores = canonical.archers.flatMap((archerRecord) => archerRecord.scores);
    const categoriesRepresented = Array.from(
      new Set(allScores.map((score) => score.category?.name).filter((name): name is string => Boolean(name)))
    ).sort();
    const teamsRepresented = Array.from(
      new Set(canonical.archers.map((archer) => archer.team).filter((team): team is string => Boolean(team)))
    ).sort();

    const totals = allScores.reduce(
      (
        accumulator: ScoreSummary & {
          eventsShot: number;
          tournamentsShot: number;
          average: number;
          best: number;
          worst: number;
        },
        scoreRecord
      ) => {
        accumulator.total += scoreRecord.total;
        accumulator.tens += scoreRecord.tens;
        accumulator.xCount += scoreRecord.xCount;
        accumulator.nines += scoreRecord.nines;
        accumulator.arrows += scoreRecord.arrows;
        return accumulator;
      },
      {
        total: 0,
        tens: 0,
        xCount: 0,
        nines: 0,
        arrows: 0,
        eventsShot: 0,
        tournamentsShot: 0,
        average: 0,
        best: 0,
        worst: 0
      }
    );

    const tournamentsMap = new Map<
      number,
      {
        tournamentId: number;
        tournamentName: string;
        totals: ScoreSummary;
        eventsShot: number;
        scores: Array<typeof allScores[number]>;
      }
    >();

    for (const score of allScores) {
      totals.eventsShot += 1;
      const tournamentId = score.event.tournamentId;
      if (!tournamentId) {
        continue;
      }

      let entry = tournamentsMap.get(tournamentId);
      if (!entry) {
        entry = {
          tournamentId,
          tournamentName: score.event.tournament?.name ?? '',
          totals: { total: 0, tens: 0, xCount: 0, nines: 0, arrows: 0 },
          eventsShot: 0,
          scores: []
        };
        tournamentsMap.set(tournamentId, entry);
      }

      entry.totals.total += score.total;
      entry.totals.tens += score.tens;
      entry.totals.xCount += score.xCount;
      entry.totals.nines += score.nines;
      entry.totals.arrows += score.arrows;
      entry.eventsShot += 1;
      entry.scores.push(score);
    }

    totals.tournamentsShot = tournamentsMap.size;
    const allTotals = allScores.map((score) => score.total);
    totals.best = allTotals.length > 0 ? Math.max(...allTotals) : 0;
    totals.worst = allTotals.length > 0 ? Math.min(...allTotals) : 0;
    totals.average = totals.eventsShot > 0 ? totals.total / totals.eventsShot : 0;

    const tournaments = Array.from(tournamentsMap.values())
      .map(({ tournamentId, tournamentName, scores }) => {
        const sortedScores = [...scores].sort(compareScoresByTournamentEventOrderDesc);
        const latest = sortedScores[0] ?? null;
        const categoryMap = new Map<
          string,
          {
            categoryName: string;
            sourceArcherId: number | null;
            latestRanking: number | null;
            totals: Pick<ScoreSummary, 'total' | 'tens' | 'xCount' | 'arrows'>;
            average: number;
            includedEvents: number;
          }
        >();

        const scoresByCategory = new Map<string, typeof scores>();
        for (const score of scores) {
          const categoryName = score.category?.name ?? 'Uncategorized';
          const existingCategoryScores = scoresByCategory.get(categoryName);
          if (existingCategoryScores) {
            existingCategoryScores.push(score);
          } else {
            scoresByCategory.set(categoryName, [score]);
          }
        }

        for (const [categoryName, categoryScores] of scoresByCategory.entries()) {
          const bestFour = [...categoryScores].sort((a, b) => b.total - a.total).slice(0, 4);
          const sourceArcherId = bestFour.find((score) => score.archerId)?.archerId ?? null;
          const latestScore = [...categoryScores].sort(compareScoresByTournamentEventOrderDesc)[0] ?? null;
          const totals = bestFour.reduce(
            (accumulator, score) => {
              accumulator.total += score.total;
              accumulator.tens += score.tens;
              accumulator.xCount += score.xCount;
              accumulator.arrows += score.arrows;
              return accumulator;
            },
            { total: 0, tens: 0, xCount: 0, arrows: 0 }
          );

          categoryMap.set(categoryName, {
            categoryName,
            sourceArcherId,
            latestRanking: latestScore?.ranking ?? null,
            totals,
            average: bestFour.length > 0 ? totals.total / bestFour.length : 0,
            includedEvents: bestFour.length
          });
        }

        const categoryRows = Array.from(categoryMap.values()).sort((a, b) =>
          a.categoryName.localeCompare(b.categoryName)
        );
        const normalizedTournamentTotals = categoryRows.reduce<ScoreSummary>(
          (accumulator, category) => {
            accumulator.total += category.totals.total;
            accumulator.tens += category.totals.tens;
            accumulator.xCount += category.totals.xCount;
            accumulator.arrows += category.totals.arrows;
            return accumulator;
          },
          { total: 0, tens: 0, xCount: 0, nines: 0, arrows: 0 }
        );
        const normalizedEventsShot = categoryRows.reduce(
          (accumulator, category) => accumulator + category.includedEvents,
          0
        );
        const includedTotals = scoresByCategory.size
          ? Array.from(scoresByCategory.values()).flatMap((categoryScores) =>
              [...categoryScores].sort((a, b) => b.total - a.total).slice(0, 4).map((score) => score.total)
            )
          : [];
        const best = includedTotals.length > 0 ? Math.max(...includedTotals) : 0;
        const worst = includedTotals.length > 0 ? Math.min(...includedTotals) : 0;
        const average =
          normalizedEventsShot > 0 ? normalizedTournamentTotals.total / normalizedEventsShot : 0;

        return {
          tournamentId,
          tournamentName,
          eventsShot: normalizedEventsShot,
          totals: normalizedTournamentTotals,
          average,
          best,
          worst,
          latestRanking: latest?.ranking ?? null,
          lastEventDate: latest?.event.lastSyncedAt ?? null,
          categories: categoryRows
        } satisfies CanonicalArcherProfileResponse['tournaments'][number];
      })
      .sort((a, b) => {
        const aTime = a.lastEventDate ? a.lastEventDate.getTime() : 0;
        const bTime = b.lastEventDate ? b.lastEventDate.getTime() : 0;
        return bTime - aTime;
      });

    return {
      canonicalArcher: {
        id: canonical.id,
        primaryFirstName: canonical.primaryFirstName,
        primaryLastName: canonical.primaryLastName,
        primaryTeam: canonical.primaryTeam,
        normalizedKey: canonical.normalizedKey
      },
      combinedProfile: {
        aggregationRule: 'best 4 results per category record within each tournament summary',
        categoriesRepresented,
        teamsRepresented,
        linkedRecords: canonical.archers.length,
        tournamentsRepresented: tournamentsMap.size
      },
      linkedArchers,
      totals,
      tournaments
    } satisfies CanonicalArcherProfileResponse;
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

function compareScoresByTournamentEventOrderDesc(
  a: { event: { displayOrder: number | null; id: number } },
  b: { event: { displayOrder: number | null; id: number } }
): number {
  const orderDelta = (b.event.displayOrder ?? b.event.id) - (a.event.displayOrder ?? a.event.id);
  if (orderDelta !== 0) {
    return orderDelta;
  }

  return b.event.id - a.event.id;
}
