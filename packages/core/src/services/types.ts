export interface ScoreSummary {
  total: number;
  tens: number;
  xCount: number;
  nines: number;
  arrows: number;
}

export interface EventBreakdown extends ScoreSummary {
  eventId: number;
  eventName: string;
  displayOrder: number | null;
  ranking: number | null;
  categoryName: string | null;
  deltaFromPrevious: number | null;
  rankingDelta: number | null;
  tieBreak: Array<{ label: string; value: number }> | null;
  rawScore: string;
  syncedAt: Date | null;
}

export interface LeaderboardEntry {
  archerId: number;
  fullName: string;
  conditionCode: string | null;
  team: string | null;
  totals: ScoreSummary;
  eventsShot: number;
  average: number;
  best: number;
  worst: number;
  trend: number | null;
  latestRanking: number | null;
  latestCategory: string | null;
  breakdown: EventBreakdown[];
  rank: number;
}

export interface TournamentLeaderboardResponse {
  tournament: {
    id: number;
    name: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    lastSyncedAt: Date | null;
    events: Array<{
      id: number;
      name: string;
      displayOrder: number | null;
      lastSyncedAt: Date | null;
    }>;
  };
  leaderboard: LeaderboardEntry[];
}

export interface EventCategoryLeaderboard {
  categoryId: number;
  categoryName: string;
  scores: Array<{
    archerId: number;
    fullName: string;
    total: number;
    tens: number;
    xCount: number;
    nines: number;
    arrows: number;
    ranking: number | null;
    tieBreak: Array<{ label: string; value: number }> | null;
    rawScore: string;
  }>;
}

export interface EventLeaderboardResponse {
  event: {
    id: number;
    name: string;
    displayOrder: number | null;
    tournamentId: number;
    tournamentName: string | null;
    lastSyncedAt: Date | null;
  };
  categories: EventCategoryLeaderboard[];
}

export interface ArcherProfileResponse {
  archer: {
    id: number;
    firstName: string;
    lastName: string;
    conditionCode: string | null;
    team: string | null;
    alias: string | null;
  };
  totals: ScoreSummary & { eventsShot: number; average: number };
  events: Array<{
    eventId: number;
    eventName: string;
    tournamentId: number;
    tournamentName: string;
    total: number;
    ranking: number | null;
    categoryName: string | null;
    tieBreak: Array<{ label: string; value: number }> | null;
    rawScore: string;
    arrows: number;
  }>;
}
