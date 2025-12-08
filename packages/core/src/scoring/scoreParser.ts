export interface ScoreBreakdown {
  sanitized: string;
  total: number;
  arrows: number;
  tens: number;
  xCount: number;
  nines: number;
  scoringRule: number;
  tieBreak: Array<{ label: string; value: number }>;
}

const ARROW_VALUE_MAP: Record<string, { value: number; label: string; countsAsArrow: boolean }> = {
  M: { value: 0, label: 'M', countsAsArrow: true },
  '0': { value: 0, label: '0', countsAsArrow: true },
  '1': { value: 1, label: '1', countsAsArrow: true },
  '2': { value: 2, label: '2', countsAsArrow: true },
  '3': { value: 3, label: '3', countsAsArrow: true },
  '4': { value: 4, label: '4', countsAsArrow: true },
  '5': { value: 5, label: '5', countsAsArrow: true },
  '6': { value: 6, label: '6', countsAsArrow: true },
  '7': { value: 7, label: '7', countsAsArrow: true },
  '8': { value: 8, label: '8', countsAsArrow: true },
  '9': { value: 9, label: '9', countsAsArrow: true },
  T: { value: 10, label: '10', countsAsArrow: true },
  X: { value: 10, label: 'X', countsAsArrow: true },
  W: { value: 5, label: 'X', countsAsArrow: true },
  Y: { value: 11, label: 'X', countsAsArrow: true },
  Z: { value: 6, label: 'X', countsAsArrow: true },
  a: { value: 11, label: '11', countsAsArrow: true },
  b: { value: 12, label: '12', countsAsArrow: true },
  d: { value: 14, label: '14', countsAsArrow: true },
  E: { value: 0, label: '', countsAsArrow: false },
  '!': { value: 0, label: '', countsAsArrow: false }
};

type TieBreakerRule = Array<{ label: string; pattern: RegExp }>;

const TIE_BREAKER_RULES: Record<number, TieBreakerRule> = {
  0: [
    { label: '10s', pattern: /[T]/g },
    { label: '9s', pattern: /[9]/g }
  ],
  1: [
    { label: '10s', pattern: /[TX]/g },
    { label: 'Xs', pattern: /[X]/g }
  ],
  2: [{ label: '10s', pattern: /[T]/g }],
  3: [
    { label: '6s', pattern: /[6]/g },
    { label: '5s', pattern: /[5]/g }
  ],
  4: [{ label: '11s', pattern: /[a]/g }],
  5: [{ label: '12s', pattern: /[bd!]/g }],
  6: [{ label: 'Xs', pattern: /[W]/g }],
  7: [],
  8: [],
  9: [
    { label: '11s', pattern: /[a]/g },
    { label: '10s', pattern: /[T]/g }
  ],
  10: [],
  11: [{ label: 'Bonus', pattern: /[bd!]/g }],
  12: [{ label: 'Xs', pattern: /[W]/g }],
  13: [
    { label: 'Xs', pattern: /[X]/g },
    { label: '10s', pattern: /[TX]/g },
    { label: '9s', pattern: /[9]/g }
  ],
  14: [{ label: 'Xs', pattern: /[Z]/g }],
  15: [
    { label: '10s', pattern: /[T]/g },
    { label: '8s', pattern: /[8]/g }
  ],
  16: [
    { label: '11s', pattern: /[a]/g },
    { label: '10s', pattern: /[T]/g }
  ]
};

export function parseScoreString(raw: string | null | undefined, scoringRule = 1): ScoreBreakdown {
  const sanitized = (raw ?? '').replace(/\s+/g, '').toUpperCase();
  let total = 0;
  let arrows = 0;
  let tens = 0;
  let xCount = 0;
  let nines = 0;

  for (const char of sanitized) {
    const entry = ARROW_VALUE_MAP[char];
    if (!entry) {
      continue;
    }

    total += entry.value;
    if (entry.countsAsArrow) {
      arrows += 1;
    }
    if (char === 'T' || char === 'X' || char === 'Y') {
      tens += 1;
    }
    if (char === 'X' || char === 'Y') {
      xCount += 1;
    }
    if (char === '9') {
      nines += 1;
    }
  }

  const tieBreakConfig = TIE_BREAKER_RULES[scoringRule] ?? [];
  const tieBreak = tieBreakConfig.map(({ label, pattern }) => ({
    label,
    value: sanitized ? (sanitized.match(pattern) || []).length : 0
  }));

  return {
    sanitized,
    total,
    arrows,
    tens,
    xCount,
    nines,
    scoringRule,
    tieBreak
  };
}
