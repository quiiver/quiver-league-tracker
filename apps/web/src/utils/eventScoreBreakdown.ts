type ArrowEntry = {
  label: string;
  value: number;
  countsAsArrow: boolean;
};

const ARROW_VALUE_MAP: Record<string, ArrowEntry> = {
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
  A: { value: 11, label: '11', countsAsArrow: true },
  B: { value: 12, label: '12', countsAsArrow: true },
  D: { value: 14, label: '14', countsAsArrow: true },
  E: { value: 0, label: '', countsAsArrow: false },
  '!': { value: 0, label: '', countsAsArrow: false }
};

export interface EventEndBreakdown {
  endNumber: number;
  arrows: string[];
  endTotal: number;
  runningTotal: number;
}

export interface EventRoundBreakdown {
  roundNumber: number;
  ends: EventEndBreakdown[];
}

export interface ParsedEventScoreBreakdown {
  roundsCount: number;
  endsPerRound: number;
  arrowsPerEnd: number;
  arrowsShot: number;
  arrowsPossible: number;
  arrowAverage: number;
  rounds: EventRoundBreakdown[];
}

export function buildEventScoreBreakdown(options: {
  rawScore: string;
  total: number;
  arrows: number;
  roundsCount: number | null;
  endsPerRound: number | null;
  arrowsPerEnd: number | null;
}): ParsedEventScoreBreakdown | null {
  const { rawScore, total, arrows, roundsCount, endsPerRound, arrowsPerEnd } = options;
  if (!roundsCount || !endsPerRound || !arrowsPerEnd) {
    return null;
  }

  const arrowEntries = Array.from((rawScore ?? '').replace(/\s+/g, '').toUpperCase())
    .map((char) => ARROW_VALUE_MAP[char] ?? null)
    .filter((entry): entry is ArrowEntry => entry !== null && entry.countsAsArrow);

  let index = 0;
  let runningTotal = 0;
  const rounds: EventRoundBreakdown[] = [];

  for (let roundNumber = 1; roundNumber <= roundsCount; roundNumber += 1) {
    const ends: EventEndBreakdown[] = [];

    for (let endNumber = 1; endNumber <= endsPerRound; endNumber += 1) {
      const endEntries = arrowEntries.slice(index, index + arrowsPerEnd);
      index += arrowsPerEnd;

      if (endEntries.length === 0) {
        break;
      }

      const endTotal = endEntries.reduce((sum, entry) => sum + entry.value, 0);
      runningTotal += endTotal;
      ends.push({
        endNumber,
        arrows: endEntries.map((entry) => entry.label),
        endTotal,
        runningTotal
      });
    }

    if (ends.length === 0) {
      break;
    }

    rounds.push({ roundNumber, ends });
  }

  return {
    roundsCount,
    endsPerRound,
    arrowsPerEnd,
    arrowsShot: arrows,
    arrowsPossible: roundsCount * endsPerRound * arrowsPerEnd,
    arrowAverage: arrows > 0 ? total / arrows : 0,
    rounds
  };
}
