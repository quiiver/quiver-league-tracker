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
  canonicalArcherId: number | null;
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
    lastSyncedAt: Date | null;
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
  totals: ScoreSummary & { eventsShot: number; average: number };
  events: Array<{
    eventId: number;
    eventName: string;
    tournamentId: number;
    tournamentName: string;
    tournamentStartDate: Date | null;
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
  totals: ScoreSummary & {
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
    totals: ScoreSummary;
    average: number;
    best: number;
    worst: number;
    latestRanking: number | null;
    lastEventDate: Date | null;
    categories: Array<{
      categoryName: string;
      sourceArcherId: number | null;
      latestRanking: number | null;
      totals: Pick<ScoreSummary, 'total' | 'tens' | 'xCount' | 'arrows'>;
      average: number;
      includedEvents: number;
    }>;
  }>;
}
