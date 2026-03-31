import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEventLeaderboard } from '../hooks/useEventLeaderboard';
import { buildEventScoreBreakdown } from '../utils/eventScoreBreakdown';
import { toCategorySlug } from '../utils/tournamentCategories';

export default function EventCategoryDetailPage(): JSX.Element {
  const params = useParams();
  const eventId = params.eventId ? Number.parseInt(params.eventId, 10) : NaN;
  const tournamentId = params.tournamentId ? Number.parseInt(params.tournamentId, 10) : NaN;
  const categorySlug = params.categorySlug ?? '';
  const { data, isLoading, isError, error } = useEventLeaderboard(eventId, Number.isFinite(eventId));

  if (!Number.isFinite(eventId) || !Number.isFinite(tournamentId)) {
    return <p className="text-muted">Invalid event id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading event breakdown…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  const activeCategory = data.categories
    .filter((category) => category.scores.length > 0)
    .find((category) => toCategorySlug(category.categoryName) === categorySlug);

  if (!activeCategory) {
    return (
      <section>
        <h1>{data.event.name}</h1>
        <p className="text-muted">Unknown category for this event.</p>
        <p>
          <Link to={`/tournaments/${tournamentId}/categories/${categorySlug}`}>Return to category results</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>{data.event.name}</h1>
      <p className="text-muted">
        <Link to={`/tournaments/${tournamentId}`}>{data.event.tournamentName}</Link> ·{' '}
        <Link to={`/tournaments/${tournamentId}/categories/${categorySlug}`}>{activeCategory.categoryName}</Link>
      </p>
      <div className="section-nav">
        <Link className="button" to={`/tournaments/${tournamentId}`}>
          Tournament Results
        </Link>
        <Link className="button" to={`/tournaments/${tournamentId}/categories/${categorySlug}`}>
          Category Results
        </Link>
      </div>

      <section>
        <h2>Event Breakdown</h2>
        <p className="text-muted">
          {data.event.roundsCount ?? '—'} rounds · {data.event.endsPerRound ?? '—'} ends per round ·{' '}
          {data.event.arrowsPerEnd ?? '—'} arrows per end
        </p>
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
              {activeCategory.scores.map((score) => {
                const breakdown = buildEventScoreBreakdown({
                  rawScore: score.rawScore,
                  total: score.total,
                  arrows: score.arrows,
                  roundsCount: data.event.roundsCount,
                  endsPerRound: data.event.endsPerRound,
                  arrowsPerEnd: data.event.arrowsPerEnd
                });

                return (
                  <Fragment key={score.archerId}>
                    <tr>
                      <td>{score.ranking ?? '–'}</td>
                      <td>
                        <Link
                          to={`/tournaments/${tournamentId}/categories/${categorySlug}/archers/${score.archerId}`}
                        >
                          {score.fullName}
                        </Link>
                      </td>
                      <td>{score.total}</td>
                      <td>{score.tens}</td>
                      <td>{score.xCount}</td>
                      <td>{score.rawScore}</td>
                    </tr>
                    {breakdown ? (
                      <tr className="event-breakdown-row">
                        <td colSpan={6}>
                          <details className="event-breakdown">
                            <summary>
                              Arr Avg [Count]: {breakdown.arrowAverage.toFixed(3)} [{breakdown.arrowsShot}/
                              {breakdown.arrowsPossible}]
                            </summary>
                            {breakdown.rounds.map((round) => (
                              <div key={`${score.archerId}-round-${round.roundNumber}`} className="event-round">
                                <strong>Round {round.roundNumber}</strong>
                                <div className="table-container">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>End</th>
                                        {Array.from({ length: breakdown.arrowsPerEnd }, (_, index) => (
                                          <th key={`${score.archerId}-arrow-header-${index + 1}`}>
                                            {index + 1}
                                          </th>
                                        ))}
                                        <th>Total</th>
                                        <th>Running</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {round.ends.map((end) => (
                                        <tr key={`${score.archerId}-round-${round.roundNumber}-end-${end.endNumber}`}>
                                          <td>{end.endNumber}</td>
                                          {Array.from({ length: breakdown.arrowsPerEnd }, (_, index) => (
                                            <td
                                              key={`${score.archerId}-round-${round.roundNumber}-end-${end.endNumber}-arrow-${index + 1}`}
                                            >
                                              {end.arrows[index] ?? '—'}
                                            </td>
                                          ))}
                                          <td>{end.endTotal}</td>
                                          <td>{end.runningTotal}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </details>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
