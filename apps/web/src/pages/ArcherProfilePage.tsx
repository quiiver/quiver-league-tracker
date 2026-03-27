import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
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

  const distinctCategories = Array.from(
    new Set(eventsWithMetrics.map((event) => event.categoryName).filter((name): name is string => Boolean(name)))
  );

  const categoryHeading =
    distinctCategories.length === 0
      ? 'Uncategorized'
      : distinctCategories.length === 1
        ? distinctCategories[0]
        : `${distinctCategories[0]} +${distinctCategories.length - 1} more`;

  // Group events by tournament and category
  type EventMetric = (typeof eventsWithMetrics)[number];

  const tournamentGroups = eventsWithMetrics.reduce((acc, event) => {
    const key = event.tournamentId;
    if (!acc[key]) {
      acc[key] = {
        tournamentId: event.tournamentId,
        tournamentName: event.tournamentName,
        categories: new Map()
      };
    }

    const categoryKey = event.categoryName ?? 'Uncategorized';
    if (!acc[key].categories.has(categoryKey)) {
      acc[key].categories.set(categoryKey, []);
    }
    (acc[key].categories.get(categoryKey) as EventMetric[]).push(event);

    return acc;
  }, {} as Record<number, { tournamentId: number; tournamentName: string; categories: Map<string, EventMetric[]> }>);

  // Calculate tournament aggregates (best 4 per category)
  const tournamentSummaries = Object.values(tournamentGroups).map((tournament) => {
    const allEvents: typeof eventsWithMetrics = [];
    let totalScore = 0;
    let totalTens = 0;
    let totalXs = 0;
    let eventCount = 0;

    tournament.categories.forEach((categoryEvents) => {
      // Sort by total descending and take best 4
      const sorted = [...categoryEvents].sort((a, b) => b.total - a.total);
      const best4 = sorted.slice(0, 4);
      
      allEvents.push(...categoryEvents);
      
      best4.forEach((event) => {
        totalScore += event.total;
        totalTens += event.tens;
        totalXs += event.xCount;
        eventCount++;
      });
    });

    return {
      ...tournament,
      events: allEvents,
      totalScore,
      totalTens,
      totalXs,
      eventCount,
      average: eventCount > 0 ? totalScore / eventCount : 0
    };
  });

  const scoreDistribution = calculateScoreDistribution(eventsWithMetrics);

  return (
    <section>
      <h1>
        {data.archer.firstName} {data.archer.lastName} - {categoryHeading}
      </h1>
      {data.archer.canonicalArcherId && (
        <p>
          <Link to={`/profiles/${data.archer.canonicalArcherId}`}>View full career summary</Link>
        </p>
      )}

      <section>
        <h2>Overall Statistics</h2>
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

      <h2>Tournament → Event Results</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tournament / Event</th>
              <th>Category</th>
              <th>Place</th>
              <th>Total</th>
              <th>Average</th>
              <th>Xs</th>
              <th>10s</th>
            </tr>
          </thead>
          <tbody>
            {tournamentSummaries.map((tournament) => (
              <Fragment key={`group-${tournament.tournamentId}`}>
                <tr className="tournament-row">
                  <td>
                    <strong>
                      <Link to={`/tournaments/${tournament.tournamentId}/overall`} className="table-link">
                        {tournament.tournamentName}
                      </Link>
                    </strong>
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td><strong>{tournament.totalScore}</strong></td>
                  <td><strong>{tournament.average.toFixed(1)}</strong></td>
                  <td><strong>{tournament.totalXs}</strong></td>
                  <td><strong>{tournament.totalTens}</strong></td>
                </tr>
                {tournament.events.map((event) => (
                  <tr key={`event-${event.eventId}-${event.categoryName ?? 'uncat'}`} className="event-row">
                    <td>
                      <div style={{ paddingLeft: '2rem' }}>
                        <Link to={`/events/${event.eventId}`} className="table-link">
                          {event.eventName}
                        </Link>
                      </div>
                    </td>
                    <td>{event.categoryName ?? '—'}</td>
                    <td>{event.ranking ?? '—'}</td>
                    <td>{event.total}</td>
                    <td>{event.averagePerArrow.toFixed(2)}</td>
                    <td>{event.xCount}</td>
                    <td>{event.tens}</td>
                  </tr>
                ))}
              </Fragment>
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
