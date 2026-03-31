import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSuspiciousCanonicalProfiles, fetchTournaments } from '../api/client';
import { sortTournamentsByStartDateDesc } from '../utils/tournamentSort';

export default function AdminHomePage(): JSX.Element {
  const tournamentsQuery = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
    staleTime: 60_000
  });
  const suspiciousQuery = useQuery({
    queryKey: ['admin', 'canonical-suspicious'],
    queryFn: fetchSuspiciousCanonicalProfiles,
    staleTime: 60_000
  });

  const tournaments = sortTournamentsByStartDateDesc(tournamentsQuery.data ?? []);
  const suspicious = suspiciousQuery.data ?? [];
  const recentlySynced = tournaments.filter((tournament) => tournament.lastSyncedAt).length;
  const unsynced = tournaments.length - recentlySynced;
  const totalReasons = suspicious.reduce((sum, profile) => sum + profile.reasons.length, 0);

  return (
    <section>
      <h1>Admin</h1>
      <p className="text-muted">
        Operational dashboard for tournament sync workflows and canonical profile review.
      </p>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Tracked Tournaments</div>
          <div className="stat-value">{tournaments.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Recently Synced</div>
          <div className="stat-value">{recentlySynced}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Unsynced</div>
          <div className="stat-value">{unsynced}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Suspicious Canonicals</div>
          <div className="stat-value">{suspicious.length}</div>
        </div>
      </div>

      <div className="admin-grid">
        <section className="card">
          <h2>Capabilities</h2>
          <ul className="link-list">
            <li>
              <Link className="admin-link-card" to="/admin/tournaments">
                <strong>Tournament Management</strong>
                <span className="text-muted">
                  Sync tournaments, review recency, and remove stale data from the local database.
                </span>
              </Link>
            </li>
            <li>
              <Link className="admin-link-card" to="/admin/canonical-profiles">
                <strong>Canonical Profile Review</strong>
                <span className="text-muted">
                  Inspect suspicious profile merges and manually link or detach archer records.
                </span>
              </Link>
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>Dashboard</h2>
          {tournamentsQuery.isLoading || suspiciousQuery.isLoading ? (
            <p className="text-muted">Loading admin metrics…</p>
          ) : tournamentsQuery.isError ? (
            <p className="text-muted">Error: {(tournamentsQuery.error as Error).message}</p>
          ) : suspiciousQuery.isError ? (
            <p className="text-muted">Error: {(suspiciousQuery.error as Error).message}</p>
          ) : (
            <ul className="link-list">
              <li className="admin-summary-row">
                <strong>{suspicious.length}</strong>
                <span className="text-muted">
                  canonical profiles currently flagged for review across {totalReasons} total warning signals
                </span>
              </li>
              <li className="admin-summary-row">
                <strong>{tournaments.slice(0, 3).map((t) => t.name).join(', ') || 'No tournaments yet'}</strong>
                <span className="text-muted">
                  next entries in descending tournament start-date order
                </span>
              </li>
              <li className="admin-summary-row">
                <strong>{unsynced}</strong>
                <span className="text-muted">
                  tournaments with no recorded sync timestamp and likely needing an initial ingest
                </span>
              </li>
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
