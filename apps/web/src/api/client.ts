import type {
  ArcherProfileResponse,
  EventLeaderboardResponse,
  TournamentLeaderboardResponse,
  TournamentSummary
} from './types';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function fetchTournaments(): Promise<TournamentSummary[]> {
  return request<TournamentSummary[]>('/api/tournaments');
}

export function fetchTournamentLeaderboard(
  tournamentId: number
): Promise<TournamentLeaderboardResponse> {
  return request<TournamentLeaderboardResponse>(`/api/tournaments/${tournamentId}/leaderboard`);
}

export function fetchEventLeaderboard(eventId: number): Promise<EventLeaderboardResponse> {
  return request<EventLeaderboardResponse>(`/api/events/${eventId}/leaderboard`);
}

export function fetchArcherProfile(
  archerId: number,
  tournamentId?: number
): Promise<ArcherProfileResponse> {
  const search = tournamentId ? `?tournamentId=${tournamentId}` : '';
  return request<ArcherProfileResponse>(`/api/archers/${archerId}${search}`);
}
