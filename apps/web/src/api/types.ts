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
  canonicalArcherId: number | null;
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
    canonicalArcherId: number | null;
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
    canonicalArcherId: number | null;
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
    canonicalArcherId: number | null;
    total: number;
    tens: number;
    xCount: number;
    nines: number;
    ranking: number | null;
    categoryName: string | null;
    tieBreak: Array<{ label: string; value: number }> | null;
    rawScore: string;
    arrows: number;
  }>;
}

export interface CanonicalArcherProfileResponse {
  canonicalArcher: {
    id: number;
    primaryFirstName: string | null;
    primaryLastName: string | null;
    primaryTeam: string | null;
    normalizedKey: string;
  };
  linkedArchers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    team: string | null;
  }>;
  totals: {
    total: number;
    tens: number;
    xCount: number;
    nines: number;
    arrows: number;
    eventsShot: number;
    tournamentsShot: number;
    average: number;
    best: number;
    worst: number;
  };
  tournaments: Array<{
    tournamentId: number;
    tournamentName: string;
    eventsShot: number;
    totals: {
      total: number;
      tens: number;
      xCount: number;
      nines: number;
      arrows: number;
    };
    average: number;
    best: number;
    worst: number;
    latestRanking: number | null;
    lastEventDate: string | null;
  }>;
}
