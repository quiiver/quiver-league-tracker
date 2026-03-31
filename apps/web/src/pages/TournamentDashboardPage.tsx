import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeaderboardTable from '../components/LeaderboardTable';
import { useTournamentLeaderboard } from '../hooks/useTournamentLeaderboard';
import { buildTournamentCategoryGroups } from '../utils/tournamentCategories';

export default function TournamentDashboardPage(): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const tournamentId = params.tournamentId ? Number.parseInt(params.tournamentId, 10) : NaN;
  const { data, isLoading, isError, error } = useTournamentLeaderboard(
    tournamentId,
    Number.isFinite(tournamentId)
  );

  if (!Number.isFinite(tournamentId)) {
    return <p className="text-muted">Invalid tournament id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading tournament dashboard…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  const categoryGroups = buildTournamentCategoryGroups(data.leaderboard, data.tournament.events.length > 4 ? 4 : null);

  return (
    <section>
      <h1>{data.tournament.name}</h1>
      <p className="text-muted">
        Tournament dashboard · {data.tournament.location ?? 'Location TBA'} · Last sync:{' '}
        {formatRelative(data.tournament.lastSyncedAt)}
      </p>

      {categoryGroups.length > 0 ? (
        <div className="card mobile-category-menu">
          <button
            type="button"
            className="mobile-category-toggle"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            aria-expanded={isMobileMenuOpen}
          >
            Categories
          </button>
          {isMobileMenuOpen ? (
            <ul className="link-list mobile-category-list">
              {categoryGroups.map((group) => (
                <li key={group.categorySlug}>
                  <a
                    className="admin-link-card"
                    href={`#category-${group.categorySlug}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <strong>{group.categoryName}</strong>
                    <span className="text-muted">{group.entries.length} ranked archers</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {categoryGroups.length === 0 ? (
        <p className="text-muted">No category leaderboards are available yet.</p>
      ) : (
        <div className="dashboard-layout">
          <aside className="card dashboard-sidebar">
            <h2>Categories</h2>
            <ul className="link-list">
              {categoryGroups.map((group) => (
                <li key={group.categorySlug}>
                  <a className="admin-link-card" href={`#category-${group.categorySlug}`}>
                    <strong>{group.categoryName}</strong>
                    <span className="text-muted">{group.entries.length} ranked archers</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="dashboard-content">
            {categoryGroups.map((group) => (
              <section
                key={group.categorySlug}
                id={`category-${group.categorySlug}`}
                className="card dashboard-section"
              >
                <div className="dashboard-section-header">
                  <div>
                    <h2>
                      <Link to={`/tournaments/${data.tournament.id}/categories/${group.categorySlug}`}>
                        {group.categoryName}
                      </Link>
                    </h2>
                    <p className="text-muted">
                      Tournament standings for this category. Open the category page to focus on one
                      leaderboard and drill into category-specific archer records.
                    </p>
                  </div>
                </div>
                <LeaderboardTable
                  data={group.entries}
                  getArcherLink={(entry) =>
                    `/tournaments/${data.tournament.id}/categories/${group.categorySlug}/archers/${entry.archerId}`
                  }
                />
              </section>
            ))}
          </div>
        </div>
      )}
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
