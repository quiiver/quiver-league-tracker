import { Link } from 'react-router-dom';
import type { TournamentSummary } from '../api/types';

interface TournamentCardProps {
  tournament: TournamentSummary;
}

export default function TournamentCard({ tournament }: TournamentCardProps): JSX.Element {
  const { id, name, location, startDate, endDate, lastSyncedAt } = tournament;
  return (
    <div className="card">
      <h3>{name}</h3>
      <p className="text-muted">{location ?? 'Location TBA'}</p>
      <p className="text-muted">
        {formatDateRange(startDate, endDate)} · Last sync: {formatRelative(lastSyncedAt)}
      </p>
      <Link className="badge" to={`/tournaments/${id}`}>
        View Leaderboard
      </Link>
    </div>
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
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
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
