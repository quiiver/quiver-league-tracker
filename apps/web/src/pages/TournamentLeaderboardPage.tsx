import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeaderboardTable from '../components/LeaderboardTable';
import { useTournamentLeaderboard } from '../hooks/useTournamentLeaderboard';
import { applyDropLowestRule } from '../utils/leaderboardAdjustments';

export default function TournamentLeaderboardPage(): JSX.Element {
  const params = useParams();
  const tournamentId = params.tournamentId ? Number.parseInt(params.tournamentId, 10) : NaN;
  const { data, isLoading, isError, error } = useTournamentLeaderboard(
    tournamentId,
    Number.isFinite(tournamentId)
  );
  const [dropLowestTwo, setDropLowestTwo] = useState(false);
  const adjustedLeaderboard = useMemo(() => {
    const entries = data?.leaderboard ?? [];
    return dropLowestTwo ? applyDropLowestRule(entries, 2) : entries;
  }, [data?.leaderboard, dropLowestTwo]);

  if (!Number.isFinite(tournamentId)) {
    return <p className="text-muted">Invalid tournament id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading leaderboard…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  return (
    <section>
      <h1>{data.tournament.name}</h1>
      <p className="text-muted">
        {data.tournament.location ?? 'Location TBA'} · Last sync:{' '}
        {formatRelative(data.tournament.lastSyncedAt)}
      </p>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link className="badge" to={`/tournaments/${data.tournament.id}`}>
          View category leaderboards
        </Link>
      </div>

      <div className="controls">
        <button
          type="button"
          className={`button ${dropLowestTwo ? 'is-active' : ''}`}
          onClick={() => setDropLowestTwo((value) => !value)}
          aria-pressed={dropLowestTwo}
        >
          {dropLowestTwo ? 'Showing best 4 of 6 events' : 'Drop lowest two event scores'}
        </button>
      </div>

      <LeaderboardTable data={adjustedLeaderboard} />

      <h2>Events</h2>
      <div className="card-grid">
        {data.tournament.events.map((event) => (
          <div key={event.id} className="card">
            <h3>{event.name}</h3>
            <p className="text-muted">
              Order: {event.displayOrder ?? '—'} · Last sync: {formatRelative(event.lastSyncedAt)}
            </p>
            <Link className="badge" to={`/events/${event.id}`}>
              View Event
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatRelative(value: string | null): string {
  if (!value) {
    return 'never';
  }
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    return 'less than 1h ago';
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
