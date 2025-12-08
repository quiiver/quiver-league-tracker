export interface CoreConfig {
  resultsApiBaseUrl: string;
  scoringRule: number;
}

const DEFAULT_CONFIG: CoreConfig = {
  resultsApiBaseUrl: process.env.RESULTS_API_BASE_URL ?? 'https://resultsapi.herokuapp.com',
  scoringRule: Number.parseInt(process.env.SCORING_RULE ?? '1', 10) || 1
};

let cachedConfig: CoreConfig | undefined;

export function getCoreConfig(): CoreConfig {
  if (!cachedConfig) {
    cachedConfig = { ...DEFAULT_CONFIG };
  }
  return cachedConfig;
}
