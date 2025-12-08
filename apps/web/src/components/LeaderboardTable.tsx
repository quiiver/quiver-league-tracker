import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../api/types';

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

export default function LeaderboardTable({ data }: LeaderboardTableProps): JSX.Element {
  return (
    <div className="table-container">
      <table>
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
              <td>{entry.rank}</td>
              <td>
                <Link to={`/archers/${entry.archerId}`}>{entry.fullName}</Link>
              </td>
              <td>{entry.totals.total}</td>
              <td>{entry.totals.tens}</td>
              <td>{entry.totals.xCount}</td>
              <td>{formatAveragePerArrow(entry.totals.total, entry.totals.arrows)}</td>
              <td>{entry.eventsShot}</td>
              <td>{renderTrend(entry.trend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
