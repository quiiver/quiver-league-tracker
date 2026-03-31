import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useArcherProfile } from '../hooks/useArcherProfile';
import { toCategorySlug } from '../utils/tournamentCategories';
import { calculateScoreDistribution } from '../utils/scoreDistribution';

export default function ArcherProfilePage(): JSX.Element {
  const params = useParams();
  const archerId = params.archerId ? Number.parseInt(params.archerId, 10) : NaN;
  const tournamentId = params.tournamentId ? Number.parseInt(params.tournamentId, 10) : undefined;
  const categorySlug = params.categorySlug;
  const { data, isLoading, isError, error } = useArcherProfile(
    archerId,
    Number.isFinite(tournamentId ?? NaN) ? tournamentId : undefined,
    Number.isFinite(archerId)
  );

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
  const categoryLabel = distinctCategories[0] ?? 'Uncategorized';
  const isTournamentScoped = Number.isFinite(tournamentId ?? NaN);
  const scopedTournamentName =
    isTournamentScoped && eventsWithMetrics.length > 0 ? eventsWithMetrics[0].tournamentName : null;

  // Group events by tournament and category
  type EventMetric = (typeof eventsWithMetrics)[number];

  const tournamentGroups = eventsWithMetrics.reduce((acc, event) => {
    const key = event.tournamentId;
    if (!acc[key]) {
      acc[key] = {
        tournamentId: event.tournamentId,
        tournamentName: event.tournamentName,
        tournamentStartDate: event.tournamentStartDate,
        categories: new Map()
      };
    }

    const categoryKey = event.categoryName ?? 'Uncategorized';
    if (!acc[key].categories.has(categoryKey)) {
      acc[key].categories.set(categoryKey, []);
    }
    (acc[key].categories.get(categoryKey) as EventMetric[]).push(event);

    return acc;
  }, {} as Record<
    number,
    {
      tournamentId: number;
      tournamentName: string;
      tournamentStartDate: string | null;
      categories: Map<string, EventMetric[]>;
    }
  >);

  // Calculate tournament aggregates (best 4 per category)
  const tournamentSummaries = Object.values(tournamentGroups).map((tournament) => {
    const allEvents: Array<EventMetric & { countedInTournamentTotal: boolean }> = [];
    let totalScore = 0;
    let totalTens = 0;
    let totalXs = 0;
    let eventCount = 0;

    tournament.categories.forEach((categoryEvents) => {
      // Sort by total descending and take best 4
      const sorted = [...categoryEvents].sort((a, b) => b.total - a.total);
      const best4 = sorted.slice(0, 4);
      const keptEventIds = new Set(best4.map((event) => event.eventId));

      allEvents.push(
        ...categoryEvents.map((event) => ({
          ...event,
          countedInTournamentTotal: keptEventIds.has(event.eventId)
        }))
      );

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
  }).sort((a, b) => compareTournamentStartDateDesc(a.tournamentStartDate, b.tournamentStartDate, a.tournamentId, b.tournamentId));

  const scoreDistribution = calculateScoreDistribution(eventsWithMetrics);

  return (
    <section id="archer-profile">
      <h1>
        {data.archer.firstName} {data.archer.lastName} • {categoryLabel}
      </h1>
      {isTournamentScoped && scopedTournamentName ? (
        <p className="h2" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem' }}>
          <Link to={`/tournaments/${tournamentId}`}>{scopedTournamentName}</Link>
        </p>
      ) : null}

      <div className="section-nav">
        {data.archer.canonicalArcherId ? (
          <Link className="button" to={`/profiles/${data.archer.canonicalArcherId}`}>
            Archer Profile
          </Link>
        ) : null}
        {isTournamentScoped && tournamentId && categorySlug ? (
          <Link className="button" to={`/tournaments/${tournamentId}/categories/${categorySlug}`}>
            Category Results
          </Link>
        ) : null}
        {isTournamentScoped && tournamentId ? (
          <Link className="button" to={`/tournaments/${tournamentId}`}>
            Tournament Results
          </Link>
        ) : null}
      </div>

      <section id="category-results">
        <h2>Stats</h2>
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

      <h2 id="tournament-results">Tournament Results For This Category</h2>
      <p className="text-muted">
        Tournament summary rows use the best 4 event scores per category. Dropped scores are shown
        below for reference and marked explicitly.
      </p>
      <div className="table-container">
        <table className="responsive-table responsive-table--archer-history">
          <thead>
            <tr>
              <th>Tournament / Event</th>
              <th>Status</th>
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
                  <td data-label="Tournament / Event">
                    <strong>
                      <Link
                        to={
                          tournament.tournamentId === tournamentId && categorySlug
                            ? `/tournaments/${tournament.tournamentId}/categories/${categorySlug}`
                            : `/tournaments/${tournament.tournamentId}`
                        }
                        className="table-link"
                      >
                        {tournament.tournamentName}
                      </Link>
                    </strong>
                  </td>
                  <td data-label="Status">—</td>
                  <td data-label="Category">—</td>
                  <td data-label="Place">—</td>
                  <td data-label="Total"><strong>{tournament.totalScore}</strong></td>
                  <td data-label="Average"><strong>{tournament.average.toFixed(1)}</strong></td>
                  <td data-label="Xs"><strong>{tournament.totalXs}</strong></td>
                  <td data-label="10s"><strong>{tournament.totalTens}</strong></td>
                </tr>
                {tournament.events.map((event) => (
                  <tr
                    key={`event-${event.eventId}-${event.categoryName ?? 'uncat'}`}
                    className={`event-row ${event.countedInTournamentTotal ? '' : 'event-row-dropped'}`}
                  >
                    <td data-label="Tournament / Event">
                      <div style={{ paddingLeft: '2rem' }}>
                        <Link
                          to={
                            tournament.tournamentId === tournamentId
                              ? `/tournaments/${tournament.tournamentId}/categories/${categorySlug}/events/${event.eventId}`
                              : `/tournaments/${tournament.tournamentId}/categories/${toCategorySlug(
                                  event.categoryName ?? categoryLabel
                                )}/events/${event.eventId}`
                          }
                          className="table-link"
                        >
                          {event.eventName}
                        </Link>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${event.countedInTournamentTotal ? '' : 'badge-muted'}`}>
                        {event.countedInTournamentTotal ? 'Counted' : 'Dropped'}
                      </span>
                    </td>
                    <td data-label="Category">{event.categoryName ?? '—'}</td>
                    <td data-label="Place">{event.ranking ?? '—'}</td>
                    <td data-label="Total">{event.total}</td>
                    <td data-label="Average">{event.averagePerArrow.toFixed(2)}</td>
                    <td data-label="Xs">{event.xCount}</td>
                    <td data-label="10s">{event.tens}</td>
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

function compareTournamentStartDateDesc(
  aStartDate: string | null,
  bStartDate: string | null,
  aTournamentId: number,
  bTournamentId: number
): number {
  const dateDelta = getSortTime(bStartDate) - getSortTime(aStartDate);
  if (dateDelta !== 0) {
    return dateDelta;
  }

  return bTournamentId - aTournamentId;
}

function getSortTime(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}
