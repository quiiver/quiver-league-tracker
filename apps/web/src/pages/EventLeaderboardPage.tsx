import { Link, useParams } from 'react-router-dom';
import { useEventLeaderboard } from '../hooks/useEventLeaderboard';

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

  return (
    <section>
      <h1>{data.event.name}</h1>
      <p className="text-muted">
        <Link to={`/tournaments/${data.event.tournamentId}`}>{data.event.tournamentName}</Link>
      </p>

      {data.categories.map((category) => (
        <div key={category.categoryId} className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>{category.categoryName}</h3>
          <div className="table-container">
            <table>
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
                    <td>{score.ranking ?? '–'}</td>
                    <td>
                      <Link to={`/archers/${score.archerId}`}>{score.fullName}</Link>
                    </td>
                    <td>{score.total}</td>
                    <td>{score.tens}</td>
                    <td>{score.xCount}</td>
                    <td>{score.rawScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
