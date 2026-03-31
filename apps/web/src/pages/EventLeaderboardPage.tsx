import { Link, useParams } from 'react-router-dom';
import { useEventLeaderboard } from '../hooks/useEventLeaderboard';
import { toCategorySlug } from '../utils/tournamentCategories';

export default function EventLeaderboardPage(): JSX.Element {
  const params = useParams();
  const eventId = params.eventId ? Number.parseInt(params.eventId, 10) : NaN;
  const { data, isLoading, isError, error } = useEventLeaderboard(eventId, Number.isFinite(eventId));

  if (!Number.isFinite(eventId)) {
    return <p className="text-muted">Invalid event id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading event leaderboard…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  const categoriesWithArchers = data.categories.filter((category) => category.scores.length > 0);

  return (
    <section>
      <h1>{data.event.name}</h1>
      <p className="text-muted">
        <Link to={`/tournaments/${data.event.tournamentId}`}>{data.event.tournamentName}</Link>
      </p>

      {categoriesWithArchers.length === 0 ? (
        <p className="text-muted">No category results are available for this event yet.</p>
      ) : (
        categoriesWithArchers.map((category) => (
          <div key={category.categoryId} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>{category.categoryName}</h3>
            <div className="table-container">
              <table className="responsive-table responsive-table--event">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Archer</th>
                    <th>Total</th>
                    <th>10s</th>
                    <th>Xs</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {category.scores.map((score) => (
                    <tr key={score.archerId}>
                      <td data-label="Rank">{score.ranking ?? '–'}</td>
                      <td data-label="Archer">
                        <Link
                          to={`/tournaments/${data.event.tournamentId}/categories/${toCategorySlug(
                            category.categoryName
                          )}/archers/${score.archerId}`}
                        >
                          {score.fullName}
                        </Link>
                      </td>
                      <td data-label="Total">{score.total}</td>
                      <td data-label="10s">{score.tens}</td>
                      <td data-label="Xs">{score.xCount}</td>
                      <td data-label="Score">{score.rawScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
