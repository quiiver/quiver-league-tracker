import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeaderboardTable from '../components/LeaderboardTable';
import { useTournamentLeaderboard } from '../hooks/useTournamentLeaderboard';
import { buildTournamentCategoryGroups } from '../utils/tournamentCategories';

export default function TournamentCategoryPage(): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const tournamentId = params.tournamentId ? Number.parseInt(params.tournamentId, 10) : NaN;
  const categorySlug = params.categorySlug ?? '';
  const { data, isLoading, isError, error } = useTournamentLeaderboard(
    tournamentId,
    Number.isFinite(tournamentId)
  );

  if (!Number.isFinite(tournamentId)) {
    return <p className="text-muted">Invalid tournament id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading category leaderboard…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  const categoryGroups = buildTournamentCategoryGroups(data.leaderboard, data.tournament.events.length > 4 ? 4 : null);
  const activeCategory = categoryGroups.find((group) => group.categorySlug === categorySlug);

  if (!activeCategory) {
    return (
      <section>
        <h1>{data.tournament.name}</h1>
        <p className="text-muted">Unknown category.</p>
        <p>
          <Link to={`/tournaments/${data.tournament.id}`}>Return to tournament dashboard</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>{data.tournament.name}</h1>
      <p className="text-muted">
        Category leaderboard · {activeCategory.categoryName} · {data.tournament.location ?? 'Location TBA'}
      </p>

      <div className="controls">
        <Link className="badge" to={`/tournaments/${data.tournament.id}`}>
          Back to tournament dashboard
        </Link>
      </div>

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
                <Link
                  className={`admin-link-card ${group.categorySlug === activeCategory.categorySlug ? 'is-active' : ''}`}
                  to={`/tournaments/${data.tournament.id}/categories/${group.categorySlug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <strong>{group.categoryName}</strong>
                  <span className="text-muted">{group.entries.length} ranked archers</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="dashboard-layout">
        <aside className="card dashboard-sidebar">
          <h2>Categories</h2>
          <ul className="link-list">
            {categoryGroups.map((group) => (
              <li key={group.categorySlug}>
                <Link
                  className={`admin-link-card ${group.categorySlug === activeCategory.categorySlug ? 'is-active' : ''}`}
                  to={`/tournaments/${data.tournament.id}/categories/${group.categorySlug}`}
                >
                  <strong>{group.categoryName}</strong>
                  <span className="text-muted">{group.entries.length} ranked archers</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="dashboard-content">
          <section className="card dashboard-section">
            <h2>{activeCategory.categoryName}</h2>
            <p className="text-muted">
              This page is the category-specific leaderboard for {activeCategory.categoryName} within{' '}
              {data.tournament.name}. Archer links stay scoped to this tournament and category.
            </p>
            <LeaderboardTable
              data={activeCategory.entries}
              getArcherLink={(entry) =>
                `/tournaments/${data.tournament.id}/categories/${activeCategory.categorySlug}/archers/${entry.archerId}`
              }
            />
          </section>
        </div>
      </div>
    </section>
  );
}
