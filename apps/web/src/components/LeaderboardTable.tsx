import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../api/types';

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  getArcherLink?: (entry: LeaderboardEntry) => string;
}

export default function LeaderboardTable({
  data,
  getArcherLink
}: LeaderboardTableProps): JSX.Element {
  return (
    <div className="table-container">
      <table className="responsive-table responsive-table--leaderboard">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Archer</th>
            <th>Total</th>
            <th>10s</th>
            <th>Xs</th>
            <th>Avg/Arrow</th>
            <th>Events</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.archerId}>
              <td data-label="Rank">{entry.rank}</td>
              <td data-label="Archer">
                <Link to={getArcherLink ? getArcherLink(entry) : getDefaultArcherLink(entry)}>
                  {entry.fullName}
                </Link>
              </td>
              <td data-label="Total">{entry.totals.total}</td>
              <td data-label="10s">{entry.totals.tens}</td>
              <td data-label="Xs">{entry.totals.xCount}</td>
              <td data-label="Avg/Arrow">{formatAveragePerArrow(entry.totals.total, entry.totals.arrows)}</td>
              <td data-label="Events">{entry.eventsShot}</td>
              <td data-label="Trend">{renderTrend(entry.trend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getDefaultArcherLink(entry: LeaderboardEntry): string {
  return entry.canonicalArcherId ? `/profiles/${entry.canonicalArcherId}` : `/archers/${entry.archerId}`;
}

function renderTrend(trend: number | null): JSX.Element {
  if (trend === null) {
    return <span className="text-muted">—</span>;
  }

  if (trend === 0) {
    return <span className="text-muted">0</span>;
  }

  return (
    <span className={trend > 0 ? 'trend-positive' : 'trend-negative'}>
      {trend > 0 ? '+' : ''}
      {trend}
    </span>
  );
}

function formatAveragePerArrow(total: number, arrows: number): string {
  if (!Number.isFinite(total) || !Number.isFinite(arrows) || arrows <= 0) {
    return '—';
  }
  return (total / arrows).toFixed(2);
}
