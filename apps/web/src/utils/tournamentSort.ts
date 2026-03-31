import type { TournamentSummary } from '../api/types';

export function sortTournamentsByStartDateDesc(tournaments: TournamentSummary[]): TournamentSummary[] {
  return tournaments.slice().sort((a, b) => {
    const startDelta = getSortTime(b.startDate) - getSortTime(a.startDate);
    if (startDelta !== 0) {
      return startDelta;
    }

    const endDelta = getSortTime(b.endDate) - getSortTime(a.endDate);
    if (endDelta !== 0) {
      return endDelta;
    }

    return b.id - a.id;
  });
}

function getSortTime(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}
