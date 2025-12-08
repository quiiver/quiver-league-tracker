import { request } from 'undici';
import { logger } from '../logger';
import {
  EventResponse,
  EventResponseSchema,
  ScoresResponse,
  ScoresResponseSchema,
  TournamentResponse,
  TournamentResponseSchema
} from './types';

export interface ResultsApiClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://resultsapi.herokuapp.com';

export class ResultsApiClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;

  constructor(options: ResultsApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.userAgent = options.userAgent ?? 'archeryleague-tracker/0.1';
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  async getTournament(tournamentId: number): Promise<TournamentResponse> {
    const json = await this.getJson(`/tournaments/${tournamentId}`);
    return TournamentResponseSchema.parse(json);
  }

  async getEvent(eventId: number): Promise<EventResponse> {
    const json = await this.getJson(`/events/${eventId}`);
    return EventResponseSchema.parse(json);
  }

  async getScores(eventId: number): Promise<ScoresResponse> {
    const json = await this.getJson(`/events/${eventId}/scores`);
    return ScoresResponseSchema.parse(json);
  }

  private async getJson(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const { body } = await request(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'user-agent': this.userAgent
      },
      bodyTimeout: this.timeoutMs
    });

    const payload = await body.json();
    logger.debug({ url }, 'results API response received');
    return payload;
  }
}
