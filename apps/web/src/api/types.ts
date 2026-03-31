export interface TournamentSummary {
  id: number;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  lastSyncedAt: string | null;
}

export interface TournamentSyncResponse {
  tournamentId: number;
  eventIds: number[];
  syncedAt: string;
}

export interface SyncAllTournamentsResponse {
  tournamentIds: number[];
  syncedTournamentCount: number;
  syncedEventCount: number;
  syncedAt: string;
}

export interface TournamentDeleteResponse {
  tournamentId: number;
  existed: boolean;
  deletedEvents: number;
  deletedCategories: number;
  deletedParticipants: number;
  deletedScores: number;
  deletedTournament: number;
}

export interface AdminSessionResponse {
  authenticated: boolean;
  configured: boolean;
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
    roundsCount: number | null;
    endsPerRound: number | null;
    arrowsPerEnd: number | null;
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
    tournamentStartDate: string | null;
    roundsCount: number | null;
    endsPerRound: number | null;
    arrowsPerEnd: number | null;
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
  combinedProfile: {
    aggregationRule: string;
    categoriesRepresented: string[];
    teamsRepresented: string[];
    linkedRecords: number;
    tournamentsRepresented: number;
  };
  linkedArchers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    team: string | null;
    conditionCode: string | null;
    canonicalLinkMethod: string | null;
    eventsShot: number;
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
    categories: Array<{
      categoryName: string;
      sourceArcherId: number | null;
      latestRanking: number | null;
      totals: {
        total: number;
        tens: number;
        xCount: number;
        arrows: number;
      };
      average: number;
      includedEvents: number;
    }>;
  }>;
}

export interface CanonicalInspectionResponse {
  canonicalArcher: {
    id: number;
    normalizedKey: string;
    primaryFirstName: string | null;
    primaryLastName: string | null;
    primaryTeam: string | null;
    linkedArchers: number;
    totalScores: number;
    tournamentsShot: number;
  };
  archers: Array<{
    id: number;
    canonicalLinkMethod: string | null;
    canonicalLinkUpdatedAt: string | null;
    firstName: string;
    lastName: string;
    team: string | null;
    conditionCode: string | null;
    eventsShot: number;
  }>;
}

export interface CanonicalLinkResponse {
  archerId: number;
  previousCanonicalArcherId: number | null;
  canonicalArcherId: number;
  linkMethod: string;
}

export interface CanonicalUnlinkResponse {
  archerId: number;
  previousCanonicalArcherId: number | null;
  detached: boolean;
}

export interface SuspiciousCanonicalProfileResponse {
  canonicalArcherId: number;
  normalizedKey: string;
  displayName: string;
  linkedArchers: number;
  teams: string[];
  reasons: string[];
}
