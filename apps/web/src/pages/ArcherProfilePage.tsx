import { useParams } from 'react-router-dom';
import { useArcherProfile } from '../hooks/useArcherProfile';
import { calculateScoreDistribution } from '../utils/scoreDistribution';

export default function ArcherProfilePage(): JSX.Element {
  const params = useParams();
  const archerId = params.archerId ? Number.parseInt(params.archerId, 10) : NaN;
  const { data, isLoading, isError, error } = useArcherProfile(archerId, undefined, Number.isFinite(archerId));

  if (!Number.isFinite(archerId)) {
    return <p className="text-muted">Invalid archer id.</p>;
  }

  if (isLoading) {
    return <p className="text-muted">Loading archer statistics…</p>;
  }

  if (isError || !data) {
    return <p className="text-muted">Error: {(error as Error | undefined)?.message ?? 'Unknown'}</p>;
  }

  const averagePerArrow = data.totals.arrows > 0 ? data.totals.total / data.totals.arrows : 0;

  const eventsWithMetrics = data.events.map((event) => ({
    ...event,
    averagePerArrow: event.arrows > 0 ? event.total / event.arrows : 0
  }));

  const scoreDistribution = calculateScoreDistribution(eventsWithMetrics);

  return (
    <section>
      <h1>
        {data.archer.firstName} {data.archer.lastName}
      </h1>
      <p className="text-muted">
        Condition: {data.archer.conditionCode ?? '—'} · Team: {data.archer.team ?? '—'}
      </p>
      <p className="text-muted">
        Events: {data.totals.eventsShot} · Average: {data.totals.average.toFixed(1)} · Avg/Arrow:{' '}
        {averagePerArrow.toFixed(2)}
      </p>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tournament / Event</th>
              <th>Total</th>
              <th>Rank</th>
              <th>Category</th>
              {/* <th>Score</th> */}
              <th>Arrows</th>
              <th>Avg/Arrow</th>
            </tr>
          </thead>
          <tbody>
            {eventsWithMetrics.map((event) => (
              <tr key={`${event.tournamentId}-${event.eventId}`}>
                <td>
                  {event.tournamentName} / {event.eventName}
                </td>
                <td>{event.total}</td>
                <td>{event.ranking ?? '—'}</td>
                <td>{event.categoryName ?? '—'}</td>
                {/* <td>{event.rawScore}</td> */}
                <td>{event.arrows}</td>
                <td>{event.averagePerArrow.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scoreDistribution.bins.length > 0 && (
        <section>
          <h2>Arrow Score Distribution</h2>
          <p className="text-muted">
            Total arrows counted: {scoreDistribution.totalArrows}
          </p>
          <div className="distribution-list">
            {scoreDistribution.bins.map((bin) => {
              const width =
                scoreDistribution.maxCount > 0
                  ? Math.max(4, (bin.count / scoreDistribution.maxCount) * 100)
                  : 0;
              return (
                <div key={bin.score} className="distribution-item">
                  <div className="distribution-label">
                    <span>Score {bin.score}</span>
                    <span>{bin.count}</span>
                  </div>
                  <div className="distribution-bar-track">
                    <div className="distribution-bar-fill" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
