import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import LeaderboardTable from '../components/LeaderboardTable';
import { useTournamentLeaderboard } from '../hooks/useTournamentLeaderboard';
import type { LeaderboardEntry } from '../api/types';
import { applyDropLowestRule, assignCompetitionRanks, sortEntries } from '../utils/leaderboardAdjustments';

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
    const groups = new Map<string, Map<number, LeaderboardEntry>>();

    for (const entry of leaderboard) {
      // Extract all unique categories from breakdown
      const categoriesInBreakdown = new Set(
        entry.breakdown.map((b) => b.categoryName).filter((cat): cat is string => cat !== null)
      );

      // If no categories in breakdown, use latestCategory
      const categories = categoriesInBreakdown.size > 0 
        ? Array.from(categoriesInBreakdown)
        : [entry.latestCategory ?? FALLBACK_CATEGORY_NAME];

      // Add entry to each category it participated in
      for (const categoryName of categories) {
        if (!groups.has(categoryName)) {
          groups.set(categoryName, new Map());
        }
        const categoryMap = groups.get(categoryName)!;
        
        // Only include breakdown items for this specific category
        const filteredBreakdown = entry.breakdown.filter(b => b.categoryName === categoryName);
        
        // Calculate totals for just this category
        const categoryTotals = filteredBreakdown.reduce(
          (acc, b) => ({
            total: acc.total + b.total,
            tens: acc.tens + b.tens,
            xCount: acc.xCount + b.xCount,
            nines: acc.nines + b.nines,
            arrows: acc.arrows + b.arrows
          }),
          { total: 0, tens: 0, xCount: 0, nines: 0, arrows: 0 }
        );

        const categoryEntry = {
          ...entry,
          totals: categoryTotals,
          eventsShot: filteredBreakdown.length,
          breakdown: filteredBreakdown,
          average: filteredBreakdown.length > 0 ? categoryTotals.total / filteredBreakdown.length : 0
        };

        categoryMap.set(entry.canonicalArcherId ?? entry.archerId, categoryEntry);
      }
    }

    return Array.from(groups.entries())
      .map(([categoryName, entryMap]) => {
        const entries = Array.from(entryMap.values());
        const normalized = assignCompetitionRanks(sortEntries(entries));

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
