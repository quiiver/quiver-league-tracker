export interface ScoreLike {
  total: number;
  tens: number;
  xCount: number;
  nines: number;
  arrows: number;
}

export function compareScores(a: ScoreLike, b: ScoreLike): number {
  if (a.total !== b.total) {
    return b.total - a.total;
  }
  if (a.tens !== b.tens) {
    return b.tens - a.tens;
  }
  if (a.xCount !== b.xCount) {
    return b.xCount - a.xCount;
  }
  if (a.nines !== b.nines) {
    return b.nines - a.nines;
  }
  if (a.arrows !== b.arrows) {
    return b.arrows - a.arrows;
  }
  return 0;
}

export interface RankedEntry<T extends ScoreLike> {
  item: T;
  rank: number;
}

export function assignCompetitionRanking<T extends ScoreLike>(
  entries: T[],
  getScore: (entry: T) => ScoreLike = (entry) => entry
): RankedEntry<T>[] {
  const sorted = [...entries].sort((left, right) => compareScores(getScore(left), getScore(right)));
  const ranked: RankedEntry<T>[] = [];
  let lastScore: ScoreLike | null = null;
  let lastRank = 0;
  let itemsSeen = 0;

  for (const entry of sorted) {
    itemsSeen += 1;
    const score = getScore(entry);
    if (!lastScore || compareScores(score, lastScore) !== 0) {
      lastRank = itemsSeen;
      lastScore = score;
    }

    ranked.push({ item: entry, rank: lastRank });
  }

  return ranked;
}
