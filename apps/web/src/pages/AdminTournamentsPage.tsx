import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  deleteTournament,
  fetchTournaments,
  syncAllTournaments,
  syncTournament
} from '../api/client';
import { sortTournamentsByStartDateDesc } from '../utils/tournamentSort';

export default function AdminTournamentsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [syncTournamentId, setSyncTournamentId] = useState('');
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const tournamentsQuery = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
    staleTime: 60_000
  });

  const invalidateTournaments = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
      queryClient.invalidateQueries({ queryKey: ['tournamentLeaderboard'] }),
      queryClient.invalidateQueries({ queryKey: ['eventLeaderboard'] })
    ]);
  };

  const syncMutation = useMutation({
    mutationFn: (tournamentId: number) => syncTournament(tournamentId),
    onSuccess: async (result) => {
      setFlashMessage(
        `Tournament ${result.tournamentId} synced successfully across ${result.eventIds.length} events.`
      );
      setSyncTournamentId('');
      await invalidateTournaments();
    }
  });

  const syncAllMutation = useMutation({
    mutationFn: () => syncAllTournaments(),
    onSuccess: async (result) => {
      setFlashMessage(
        result.syncedTournamentCount === 0
          ? 'No tracked tournaments were available to sync.'
          : `Synced ${result.syncedTournamentCount} tournaments across ${result.syncedEventCount} events.`
      );
      await invalidateTournaments();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (tournamentId: number) => deleteTournament(tournamentId),
    onSuccess: async (result) => {
      setFlashMessage(
        result.existed
          ? `Tournament ${result.tournamentId} deleted. Removed ${result.deletedEvents} events and ${result.deletedScores} scores.`
          : `Tournament ${result.tournamentId} does not exist in the local database.`
      );
      await invalidateTournaments();
    }
  });

  const sortedTournaments = useMemo(
    () => sortTournamentsByStartDateDesc(tournamentsQuery.data ?? []),
    [tournamentsQuery.data]
  );

  const handleSyncSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = Number.parseInt(syncTournamentId, 10);
    if (!Number.isNaN(parsed)) {
      syncMutation.mutate(parsed);
    }
  };

  return (
    <section>
      <h1>Tournament Management</h1>
      <p className="text-muted">
        Trigger full tournament ingests, inspect current tournament records, and remove stale local data.
      </p>

      {flashMessage && <p className="admin-flash">{flashMessage}</p>}

      <div className="admin-grid">
        <section className="card">
          <h2>Sync Tournament By ID</h2>
          <form className="admin-form" onSubmit={handleSyncSubmit}>
            <label>
              <span>Tournament ID</span>
              <input
                value={syncTournamentId}
                onChange={(event) => setSyncTournamentId(event.target.value)}
                placeholder="2477"
                inputMode="numeric"
              />
            </label>
            <button type="submit" className="button" disabled={syncMutation.isPending}>
              {syncMutation.isPending ? 'Syncing…' : 'Sync Tournament'}
            </button>
          </form>
          {syncMutation.isError && <p className="text-muted">Error: {(syncMutation.error as Error).message}</p>}
        </section>

        <section className="card">
          <h2>Sync All Tracked Tournaments</h2>
          <p className="text-muted">
            Re-sync every tournament currently stored in the local database.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending || tournamentsQuery.isLoading}
          >
            {syncAllMutation.isPending ? 'Syncing All…' : 'Sync All Tournaments'}
          </button>
          {syncAllMutation.isError && (
            <p className="text-muted">Error: {(syncAllMutation.error as Error).message}</p>
          )}
        </section>

        <section className="card">
          <h2>Quick Links</h2>
          <ul className="link-list">
            <li>
              <Link className="admin-link-card" to="/admin">
                <strong>Admin Dashboard</strong>
                <span className="text-muted">Back to the admin landing page and top-level metrics.</span>
              </Link>
            </li>
            <li>
              <Link className="admin-link-card" to="/admin/canonical-profiles">
                <strong>Canonical Profile Review</strong>
                <span className="text-muted">Switch to identity repair and suspicious-merge triage.</span>
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <section className="card">
        <h2>Tracked Tournaments</h2>
        {tournamentsQuery.isLoading ? (
          <p className="text-muted">Loading tournaments…</p>
        ) : tournamentsQuery.isError ? (
          <p className="text-muted">Error: {(tournamentsQuery.error as Error).message}</p>
        ) : sortedTournaments.length === 0 ? (
          <p className="text-muted">No tournaments have been synced yet.</p>
        ) : (
          <div className="table-container">
            <table className="responsive-table responsive-table--admin-tournaments">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Location</th>
                  <th>Dates</th>
                  <th>Last Sync</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td data-label="Tournament">
                      <strong>#{tournament.id}</strong> {tournament.name}
                    </td>
                    <td data-label="Location">{tournament.location ?? '—'}</td>
                    <td data-label="Dates">{formatDateRange(tournament.startDate, tournament.endDate)}</td>
                    <td data-label="Last Sync">{formatRelative(tournament.lastSyncedAt)}</td>
                    <td data-label="Actions">
                      <div className="admin-action-row">
                        <Link className="badge" to={`/tournaments/${tournament.id}`}>
                          View
                        </Link>
                        <button
                          type="button"
                          className="button"
                          onClick={() => syncMutation.mutate(tournament.id)}
                          disabled={syncMutation.isPending}
                        >
                          Sync
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => deleteMutation.mutate(tournament.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {deleteMutation.isError && (
          <p className="text-muted">Error: {(deleteMutation.error as Error).message}</p>
        )}
      </section>
    </section>
  );
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) {
    return 'Dates TBD';
  }

  const startLabel = start ? new Date(start).toLocaleDateString() : 'TBD';
  const endLabel = end ? new Date(end).toLocaleDateString() : 'TBD';
  return `${startLabel} – ${endLabel}`;
}

function formatRelative(value: string | null): string {
  if (!value) {
    return 'never';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
