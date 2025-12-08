type ScoreCharEntry = {
  value: number;
  countsAsArrow: boolean;
};

const SCORE_CHAR_MAP: Record<string, ScoreCharEntry> = {
  M: { value: 0, countsAsArrow: true },
  '0': { value: 0, countsAsArrow: true },
  '1': { value: 1, countsAsArrow: true },
  '2': { value: 2, countsAsArrow: true },
  '3': { value: 3, countsAsArrow: true },
  '4': { value: 4, countsAsArrow: true },
  '5': { value: 5, countsAsArrow: true },
  '6': { value: 6, countsAsArrow: true },
  '7': { value: 7, countsAsArrow: true },
  '8': { value: 8, countsAsArrow: true },
  '9': { value: 9, countsAsArrow: true },
  T: { value: 10, countsAsArrow: true },
  X: { value: 10, countsAsArrow: true },
  W: { value: 5, countsAsArrow: true },
  Y: { value: 11, countsAsArrow: true },
  Z: { value: 6, countsAsArrow: true },
  A: { value: 11, countsAsArrow: true },
  B: { value: 12, countsAsArrow: true },
  D: { value: 14, countsAsArrow: true },
  E: { value: 0, countsAsArrow: false },
  '!': { value: 0, countsAsArrow: false }
};

export interface ScoreDistributionBin {
  score: number;
  count: number;
}

export interface ScoreDistribution {
  bins: ScoreDistributionBin[];
  totalArrows: number;
  maxCount: number;
}

export function calculateScoreDistribution(
  sources: Array<{ rawScore: string | null | undefined }>
): ScoreDistribution {
  const counts = new Map<number, number>();
  let totalArrows = 0;

  for (const source of sources) {
    const sanitized = (source.rawScore ?? '').replace(/\s+/g, '').toUpperCase();

    for (const char of sanitized) {
      const mapping = SCORE_CHAR_MAP[char];
      if (!mapping) {
        continue;
      }

      if (!mapping.countsAsArrow) {
        continue;
      }

      const current = counts.get(mapping.value) ?? 0;
      counts.set(mapping.value, current + 1);
      totalArrows += 1;
    }
  }

  const bins = Array.from(counts.entries())
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => b.score - a.score);

  const maxCount = bins.reduce((maximum, bin) => Math.max(maximum, bin.count), 0);

  return {
    bins,
    totalArrows,
    maxCount
  };
}
