import type {
  AdminSessionResponse,
  ArcherProfileResponse,
  CanonicalInspectionResponse,
  CanonicalLinkResponse,
  CanonicalArcherProfileResponse,
  CanonicalUnlinkResponse,
  EventLeaderboardResponse,
  SyncAllTournamentsResponse,
  SuspiciousCanonicalProfileResponse,
  TournamentDeleteResponse,
  TournamentLeaderboardResponse,
  TournamentSyncResponse,
  TournamentSummary
} from './types';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'same-origin',
    headers,
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

export function fetchAdminSession(): Promise<AdminSessionResponse> {
  return request<AdminSessionResponse>('/api/admin/session');
}

export function loginAdmin(password: string): Promise<AdminSessionResponse> {
  return request<AdminSessionResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

export function logoutAdmin(): Promise<AdminSessionResponse> {
  return request<AdminSessionResponse>('/api/admin/logout', {
    method: 'POST'
  });
}

export function syncTournament(tournamentId: number): Promise<TournamentSyncResponse> {
  return request<TournamentSyncResponse>(`/api/tournaments/${tournamentId}/sync`, {
    method: 'POST'
  });
}

export function syncAllTournaments(): Promise<SyncAllTournamentsResponse> {
  return request<SyncAllTournamentsResponse>('/api/tournaments/sync-all', {
    method: 'POST'
  });
}

export function deleteTournament(tournamentId: number): Promise<TournamentDeleteResponse> {
  return request<TournamentDeleteResponse>(`/api/tournaments/${tournamentId}`, {
    method: 'DELETE'
  });
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

export function fetchCanonicalArcherProfile(
  canonicalArcherId: number
): Promise<CanonicalArcherProfileResponse> {
  return request<CanonicalArcherProfileResponse>(`/api/canonical-archers/${canonicalArcherId}`);
}

export function fetchSuspiciousCanonicalProfiles(): Promise<SuspiciousCanonicalProfileResponse[]> {
  return request<SuspiciousCanonicalProfileResponse[]>('/api/admin/canonical-archers/suspicious');
}

export function fetchCanonicalInspection(
  canonicalArcherId: number
): Promise<CanonicalInspectionResponse> {
  return request<CanonicalInspectionResponse>(`/api/admin/canonical-archers/${canonicalArcherId}/inspect`);
}

export function linkCanonicalArcher(
  archerId: number,
  canonicalArcherId: number
): Promise<CanonicalLinkResponse> {
  return request<CanonicalLinkResponse>('/api/admin/canonical-archers/link', {
    method: 'POST',
    body: JSON.stringify({ archerId, canonicalArcherId })
  });
}

export function unlinkCanonicalArcher(archerId: number): Promise<CanonicalUnlinkResponse> {
  return request<CanonicalUnlinkResponse>('/api/admin/canonical-archers/unlink', {
    method: 'POST',
    body: JSON.stringify({ archerId })
  });
}
