import type { LeaderboardEntry } from '../api/types';
import {
  assignCompetitionRanks,
  selectTopBreakdowns,
  sortEntries
} from './leaderboardAdjustments';

const FALLBACK_CATEGORY_NAME = 'Uncategorized';

export interface TournamentCategoryGroup {
  categoryName: string;
  categorySlug: string;
  entries: LeaderboardEntry[];
}

export function buildTournamentCategoryGroups(
  leaderboard: LeaderboardEntry[],
  keepTopCount: number | null
): TournamentCategoryGroup[] {
  const groups = new Map<string, Map<number, LeaderboardEntry>>();

  for (const entry of leaderboard) {
    const categoriesInBreakdown = new Set(
      entry.breakdown.map((breakdown) => breakdown.categoryName).filter(isString)
    );
    const categories =
      categoriesInBreakdown.size > 0
        ? Array.from(categoriesInBreakdown)
        : [entry.latestCategory ?? FALLBACK_CATEGORY_NAME];

    for (const categoryName of categories) {
      if (!groups.has(categoryName)) {
        groups.set(categoryName, new Map());
      }

      const categoryBreakdown = entry.breakdown.filter(
        (breakdown) => (breakdown.categoryName ?? FALLBACK_CATEGORY_NAME) === categoryName
      );
      const filteredBreakdown =
        keepTopCount !== null
          ? selectTopBreakdowns(
              categoryBreakdown,
              Math.max(categoryBreakdown.length - keepTopCount, 0)
            )
          : categoryBreakdown;

      const categoryTotals = filteredBreakdown.reduce(
        (accumulator, breakdown) => ({
          total: accumulator.total + breakdown.total,
          tens: accumulator.tens + breakdown.tens,
          xCount: accumulator.xCount + breakdown.xCount,
          nines: accumulator.nines + breakdown.nines,
          arrows: accumulator.arrows + breakdown.arrows
        }),
        { total: 0, tens: 0, xCount: 0, nines: 0, arrows: 0 }
      );

      const categoryEntry: LeaderboardEntry = {
        ...entry,
        totals: categoryTotals,
        eventsShot: filteredBreakdown.length,
        breakdown: filteredBreakdown,
        average: filteredBreakdown.length > 0 ? categoryTotals.total / filteredBreakdown.length : 0
      };

      groups.get(categoryName)!.set(entry.canonicalArcherId ?? entry.archerId, categoryEntry);
    }
  }

  return Array.from(groups.entries())
    .map(([categoryName, entryMap]) => ({
      categoryName,
      categorySlug: toCategorySlug(categoryName),
      entries: assignCompetitionRanks(sortEntries(Array.from(entryMap.values())))
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function toCategorySlug(categoryName: string): string {
  return categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';
}

function isString(value: string | null): value is string {
  return value !== null;
}
