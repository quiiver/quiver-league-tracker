export interface TournamentSummary {
  id: number;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  lastSyncedAt: string | null;
}

export interface TournamentEventSummary {
  id: number;
  name: string;
  displayOrder: number | null;
  lastSyncedAt: string | null;
}

export interface LeaderboardEntry {
  archerId: number;
  fullName: string;
  conditionCode: string | null;
  team: string | null;
  totals: {
    total: number;
    tens: number;
    xCount: number;
    nines: number;
    arrows: number;
  };
  eventsShot: number;
  average: number;
  best: number;
  worst: number;
  trend: number | null;
  latestRanking: number | null;
  latestCategory: string | null;
  breakdown: Array<EventBreakdown>;
  rank: number;
}

export interface EventBreakdown {
  eventId: number;
  eventName: string;
  displayOrder: number | null;
  ranking: number | null;
  categoryName: string | null;
  deltaFromPrevious: number | null;
  rankingDelta: number | null;
  tieBreak: Array<{ label: string; value: number }> | null;
  rawScore: string;
  syncedAt: string | null;
  total: number;
  tens: number;
  xCount: number;
  nines: number;
  arrows: number;
}

export interface TournamentLeaderboardResponse {
  tournament: {
    id: number;
    name: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    lastSyncedAt: string | null;
    events: TournamentEventSummary[];
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
    lastSyncedAt: string | null;
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
  totals: {
    total: number;
    tens: number;
    xCount: number;
    nines: number;
    arrows: number;
    eventsShot: number;
    average: number;
  };
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
