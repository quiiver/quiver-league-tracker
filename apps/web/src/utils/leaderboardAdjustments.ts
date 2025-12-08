import type { LeaderboardEntry, EventBreakdown } from '../api/types';

const DEFAULT_DROP_COUNT = 2;

function summarizeBreakdowns(breakdowns: EventBreakdown[]) {
  let total = 0;
  let tens = 0;
  let xCount = 0;
  let nines = 0;
  let arrows = 0;
  let best = 0;
  let worst = Number.POSITIVE_INFINITY;

  for (const item of breakdowns) {
    total += item.total;
    tens += item.tens;
    xCount += item.xCount;
    nines += item.nines;
    arrows += item.arrows;
    best = Math.max(best, item.total);
    worst = Math.min(worst, item.total);
  }

  if (worst === Number.POSITIVE_INFINITY) {
    worst = 0;
  }

  return { total, tens, xCount, nines, arrows, best, worst };
}

function selectKeptBreakdowns(breakdowns: EventBreakdown[], dropCount: number): EventBreakdown[] {
  if (dropCount <= 0 || breakdowns.length === 0 || breakdowns.length <= dropCount) {
    return breakdowns;
  }

  const sortedByScore = [...breakdowns].sort((a, b) => {
    if (a.total !== b.total) {
      return a.total - b.total;
    }
    if (a.tens !== b.tens) {
      return a.tens - b.tens;
    }
    return a.xCount - b.xCount;
  });

  const dropSet = new Set(sortedByScore.slice(0, dropCount).map((item) => item.eventId));
  return breakdowns.filter((item) => !dropSet.has(item.eventId));
}

function adjustEntryTotals(entry: LeaderboardEntry, dropCount: number): LeaderboardEntry {
  if (dropCount <= 0 || entry.breakdown.length <= dropCount) {
    return { ...entry, rank: 0 };
  }

  const keptBreakdowns = selectKeptBreakdowns(entry.breakdown, dropCount);
  if (keptBreakdowns.length === entry.breakdown.length) {
    return { ...entry, rank: 0 };
  }

  const summary = summarizeBreakdowns(keptBreakdowns);
  const eventsShot = keptBreakdowns.length;
  const average = eventsShot > 0 ? summary.total / eventsShot : 0;

  return {
    ...entry,
    totals: {
      total: summary.total,
      tens: summary.tens,
      xCount: summary.xCount,
      nines: summary.nines,
      arrows: summary.arrows
    },
    eventsShot,
    average,
    best: summary.best,
    worst: summary.worst,
    trend: null,
    latestRanking: null,
    rank: 0
  };
}

function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries
    .slice()
    .sort((a, b) => {
      if (b.totals.total !== a.totals.total) {
        return b.totals.total - a.totals.total;
      }
      if (b.totals.tens !== a.totals.tens) {
        return b.totals.tens - a.totals.tens;
      }
      if (b.totals.xCount !== a.totals.xCount) {
        return b.totals.xCount - a.totals.xCount;
      }
      return a.fullName.localeCompare(b.fullName);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function applyDropLowestRule(
  entries: LeaderboardEntry[],
  dropCount: number = DEFAULT_DROP_COUNT
): LeaderboardEntry[] {
  if (dropCount <= 0) {
    return entries;
  }

  const adjusted = entries.map((entry) => adjustEntryTotals(entry, dropCount));
  return rankEntries(adjusted);
}