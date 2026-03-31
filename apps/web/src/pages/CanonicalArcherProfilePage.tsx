import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCanonicalArcherProfile } from '../hooks/useCanonicalArcherProfile';

export default function CanonicalArcherProfilePage(): JSX.Element {
  const params = useParams();
  const canonicalId = params.canonicalArcherId ? Number.parseInt(params.canonicalArcherId, 10) : NaN;
  const { data, isLoading, isError, error } = useCanonicalArcherProfile(
    canonicalId,
    Number.isFinite(canonicalId)
  );

  if (!Number.isFinite(canonicalId)) {
    return <p className="text-muted">Invalid archer profile id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading archer profile…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  const displayName = `${
    data.canonicalArcher.primaryFirstName ?? data.linkedArchers[0]?.firstName ?? ''
  } ${data.canonicalArcher.primaryLastName ?? data.linkedArchers[0]?.lastName ?? ''}`.trim();
  const averagePerArrow = data.totals.arrows > 0 ? data.totals.total / data.totals.arrows : 0;
  const categoryBreakdown = Array.from(
    data.tournaments.reduce((accumulator, tournament) => {
      for (const category of tournament.categories) {
        const existing = accumulator.get(category.categoryName);
        if (existing) {
          existing.tournamentTotal += category.totals.total;
          existing.tens += category.totals.tens;
          existing.xCount += category.totals.xCount;
          existing.arrows += category.totals.arrows;
          existing.events += category.includedEvents;
          existing.tournaments += 1;
        } else {
          accumulator.set(category.categoryName, {
            categoryName: category.categoryName,
            tournamentTotal: category.totals.total,
            tens: category.totals.tens,
            xCount: category.totals.xCount,
            arrows: category.totals.arrows,
            events: category.includedEvents,
            tournaments: 1
          });
        }
      }
      return accumulator;
    }, new Map<
      string,
      {
        categoryName: string;
        tournamentTotal: number;
        tens: number;
        xCount: number;
        arrows: number;
        events: number;
        tournaments: number;
      }
    >())
  )
    .map(([, category]) => ({
      ...category,
      tournamentAverage:
        category.tournaments > 0 ? category.tournamentTotal / category.tournaments : 0,
      averagePerArrow: category.arrows > 0 ? category.tournamentTotal / category.arrows : 0
    }))
    .sort((a, b) => {
      if (b.tournamentAverage !== a.tournamentAverage) {
        return b.tournamentAverage - a.tournamentAverage;
      }
      return a.categoryName.localeCompare(b.categoryName);
    });

  return (
    <div className="container">
      <h1>{displayName}</h1>
      <p className="text-muted">
        Combined career profile #{data.canonicalArcher.id} · Built from {data.combinedProfile.linkedRecords}{' '}
        linked category{data.combinedProfile.linkedRecords === 1 ? ' record' : ' records'}
      </p>

      <section>
        <h2>Profile</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Categories Represented</div>
            <div className="stat-value stat-value-small">
              {data.combinedProfile.categoriesRepresented.length > 0
                ? data.combinedProfile.categoriesRepresented.join(', ')
                : 'Uncategorized'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Tournaments Represented</div>
            <div className="stat-value">{data.combinedProfile.tournamentsRepresented}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Linked Category Records</div>
            <div className="stat-value">{data.combinedProfile.linkedRecords}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Teams Represented</div>
            <div className="stat-value stat-value-small">
              {data.combinedProfile.teamsRepresented.length > 0
                ? data.combinedProfile.teamsRepresented.join(', ')
                : '—'}
            </div>
          </div>
        </div>
        <p className="text-muted">{data.combinedProfile.aggregationRule}</p>
      </section>

      <section>
        <h2>Career Totals</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Total Score</div>
            <div className="stat-value">{data.totals.total}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Xs</div>
            <div className="stat-value">{data.totals.xCount}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">10s</div>
            <div className="stat-value">{data.totals.tens}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">9s</div>
            <div className="stat-value">{data.totals.nines}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Arrows Shot</div>
            <div className="stat-value">{data.totals.arrows}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Average per Arrow</div>
            <div className="stat-value">{averagePerArrow.toFixed(2)}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Category Breakdown</h2>
        <div className="table-container">
          <table className="responsive-table responsive-table--category-breakdown">
            <thead>
              <tr>
                <th>Category</th>
                <th>Tournaments</th>
                <th>Tournament Average</th>
                <th>Avg/Arrow</th>
                <th>Xs</th>
                <th>10s</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map((category) => (
                <tr key={category.categoryName}>
                  <td data-label="Category">{category.categoryName}</td>
                  <td data-label="Tournaments">{category.tournaments}</td>
                  <td data-label="Tournament Average">{category.tournamentAverage.toFixed(1)}</td>
                  <td data-label="Avg/Arrow">{category.averagePerArrow.toFixed(2)}</td>
                  <td data-label="Xs">{category.xCount}</td>
                  <td data-label="10s">{category.tens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Tournament History</h2>
        <p className="text-muted">
          Tournament rows combine the linked category records included below.
        </p>
        {data.tournaments.length === 0 ? (
          <p className="text-muted">No event results available yet.</p>
        ) : (
          <div className="table-container">
            <table className="responsive-table responsive-table--canonical-history">
              <thead>
                <tr>
                  <th>Tournament / Category</th>
                  <th>Final Event Rank</th>
                  <th>Total</th>
                  <th>Average</th>
                  <th>Xs</th>
                  <th>10s</th>
                </tr>
              </thead>
              <tbody>
                {data.tournaments.map((tournament) => (
                  <Fragment key={`tournament-${tournament.tournamentId}`}>
                    <tr className="tournament-row">
                      <td data-label="Tournament / Category">
                        <strong>
                          <Link to={`/tournaments/${tournament.tournamentId}`} className="table-link">
                            {tournament.tournamentName}
                          </Link>
                        </strong>
                      </td>
                      <td data-label="Final Event Rank">—</td>
                      <td data-label="Total">
                        <strong>{tournament.totals.total}</strong>
                      </td>
                      <td data-label="Average">
                        <strong>{tournament.average.toFixed(1)}</strong>
                      </td>
                      <td data-label="Xs">
                        <strong>{tournament.totals.xCount}</strong>
                      </td>
                      <td data-label="10s">
                        <strong>{tournament.totals.tens}</strong>
                      </td>
                    </tr>
                    {tournament.categories.map((category) => (
                      <tr
                        key={`category-${tournament.tournamentId}-${category.categoryName}-${category.sourceArcherId ?? 'unknown'}`}
                        className="event-row"
                      >
                        <td data-label="Tournament / Category" style={{ paddingLeft: '2rem' }}>
                          {category.sourceArcherId ? (
                            <Link to={`/archers/${category.sourceArcherId}`} className="table-link">
                              {category.categoryName}
                            </Link>
                          ) : (
                            category.categoryName
                          )}
                        </td>
                        <td data-label="Final Event Rank">{category.latestRanking ?? '—'}</td>
                        <td data-label="Total">{category.totals.total}</td>
                        <td data-label="Average">{category.average.toFixed(1)}</td>
                        <td data-label="Xs">{category.totals.xCount}</td>
                        <td data-label="10s">{category.totals.tens}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
