import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeaderboardTable from '../components/LeaderboardTable';
import { useTournamentLeaderboard } from '../hooks/useTournamentLeaderboard';
import type { LeaderboardEntry } from '../api/types';
import { applyDropLowestRule } from '../utils/leaderboardAdjustments';

const FALLBACK_CATEGORY_NAME = 'Uncategorized';

export default function TournamentCategoryPage(): JSX.Element {
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

  const groupedLeaderboards = useMemo(() => {
    const leaderboard = adjustedLeaderboard;
    const groups = new Map<string, LeaderboardEntry[]>();

    for (const entry of leaderboard) {
      const categoryName = entry.latestCategory ?? FALLBACK_CATEGORY_NAME;
      const bucket = groups.get(categoryName);
      if (bucket) {
        bucket.push(entry);
      } else {
        groups.set(categoryName, [entry]);
      }
    }

    return Array.from(groups.entries())
      .map(([categoryName, entries]) => {
        const sorted = [...entries].sort((a, b) => {
          if (b.totals.total !== a.totals.total) {
            return b.totals.total - a.totals.total;
          }
          if (b.totals.tens !== a.totals.tens) {
            return b.totals.tens - a.totals.tens;
          }
          return b.totals.xCount - a.totals.xCount;
        });

        const normalized = sorted.map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

        return { categoryName, entries: normalized };
      })
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [adjustedLeaderboard]);

  if (!Number.isFinite(tournamentId)) {
    return <p className="text-muted">Invalid tournament id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading category leaderboards…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  if (groupedLeaderboards.length === 0) {
    return (
      <section>
        <h1>{data.tournament.name}</h1>
        <p className="text-muted">
          {data.tournament.location ?? 'Location TBA'} · Last sync:{' '}
          {formatRelative(data.tournament.lastSyncedAt)}
        </p>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link className="badge" to={`/tournaments/${data.tournament.id}/overall`}>
            View overall leaderboard
          </Link>
        </div>
        <p className="text-muted">No leaderboard data available yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>{data.tournament.name}</h1>
      <p className="text-muted">
        {data.tournament.location ?? 'Location TBA'} · Last sync:{' '}
        {formatRelative(data.tournament.lastSyncedAt)}
      </p>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link className="badge" to={`/tournaments/${data.tournament.id}/overall`}>
          View overall leaderboard
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

      {groupedLeaderboards.map(({ categoryName, entries }) => (
        <div key={categoryName} className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{categoryName}</h2>
          <LeaderboardTable data={entries} />
        </div>
      ))}
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
