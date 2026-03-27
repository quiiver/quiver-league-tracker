import { Fragment } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchArcherProfile } from '../api/client';
import { useCanonicalArcherProfile } from '../hooks/useCanonicalArcherProfile';

export default function CanonicalArcherProfilePage(): JSX.Element {
  const params = useParams();
  const canonicalId = params.canonicalArcherId ? Number.parseInt(params.canonicalArcherId, 10) : NaN;
  const { data, isLoading, isError, error } = useCanonicalArcherProfile(
    canonicalId,
    Number.isFinite(canonicalId)
  );

  const linkedArcherProfiles = useQueries({
    queries: (data?.linkedArchers ?? []).map((archer) => ({
      queryKey: ['archerProfile', archer.id],
      queryFn: () => fetchArcherProfile(archer.id),
      enabled: !!data
    }))
  });

  const allLinkedProfilesLoaded = linkedArcherProfiles.every((query) => query.isSuccess);
  const linkedProfilesLoading = linkedArcherProfiles.some((query) => query.isLoading);

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

  const allEvents = allLinkedProfilesLoaded
    ? linkedArcherProfiles.flatMap((query) =>
        (query.data?.events ?? []).map((event) => ({
          ...event,
          sourceArcherId: query.data?.archer.id ?? null,
          averagePerArrow: event.arrows > 0 ? event.total / event.arrows : 0
        }))
      )
    : [];

  type EventType = typeof allEvents[number];
  type TournamentGroup = {
    tournamentId: number;
    tournamentName: string;
    categories: Map<string, EventType[]>;
  };

  const tournamentGroups = allEvents.reduce<Record<number, TournamentGroup>>((acc, event) => {
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
    acc[key].categories.get(categoryKey)!.push(event);

    return acc;
  }, {});

  const tournamentSummaries = Object.values(tournamentGroups).map((tournament) => {
    const allTournamentEvents: EventType[] = [];
    const categorySummaries: Array<{
      categoryName: string;
      archerId: number | null;
      place: number | null;
      total: number;
      average: number;
      xCount: number;
      tens: number;
    }> = [];
    let totalScore = 0;
    let totalTens = 0;
    let totalXs = 0;
    let eventCount = 0;

    tournament.categories.forEach((categoryEvents, categoryName) => {
      const sorted = [...categoryEvents].sort((a, b) => b.total - a.total);
      const best4 = sorted.slice(0, 4);
      const archerId = categoryEvents.find((event) => event.sourceArcherId !== null)?.sourceArcherId ?? null;
      const latestEvent = [...categoryEvents].sort((a, b) => b.eventId - a.eventId)[0];
      const finalEventRank = latestEvent?.ranking ?? null;

      const categoryTotal = best4.reduce((sum, event) => sum + event.total, 0);
      const categoryTens = best4.reduce((sum, event) => sum + event.tens, 0);
      const categoryXs = best4.reduce((sum, event) => sum + event.xCount, 0);
      const categoryCount = best4.length;

      categorySummaries.push({
        categoryName,
        archerId,
        place: finalEventRank,
        total: categoryTotal,
        average: categoryCount > 0 ? categoryTotal / categoryCount : 0,
        xCount: categoryXs,
        tens: categoryTens
      });

      allTournamentEvents.push(...categoryEvents);

      best4.forEach((event) => {
        totalScore += event.total;
        totalTens += event.tens;
        totalXs += event.xCount;
        eventCount++;
      });
    });

    return {
      ...tournament,
      categories: categorySummaries,
      totalScore,
      totalTens,
      totalXs,
      eventCount,
      average: eventCount > 0 ? totalScore / eventCount : 0
    };
  });

  return (
    <div className="container">
      <h1>{displayName}</h1>

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

      <section>
        <h2>Tournament & Event History</h2>
        {linkedProfilesLoading ? (
          <p className="text-muted">Loading event details…</p>
        ) : tournamentSummaries.length === 0 ? (
          <p className="text-muted">No event results available yet.</p>
        ) : (
          <div className="table-container">
            <table>
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
                      <td>
                        <strong>{tournament.totalScore}</strong>
                      </td>
                      <td>
                        <strong>{tournament.average.toFixed(1)}</strong>
                      </td>
                      <td>
                        <strong>{tournament.totalXs}</strong>
                      </td>
                      <td>
                        <strong>{tournament.totalTens}</strong>
                      </td>
                    </tr>
                    {tournament.categories.map((category) => (
                      <tr
                        key={`category-${tournament.tournamentId}-${category.categoryName}-${category.archerId ?? 'unknown'}`}
                        className="event-row"
                      >
                        <td style={{ paddingLeft: '2rem' }}>
                          {category.archerId ? (
                            <Link to={`/archers/${category.archerId}`} className="table-link">
                              {category.categoryName}
                            </Link>
                          ) : (
                            category.categoryName
                          )}
                        </td>
                        <td>{category.place ?? '—'}</td>
                        <td>{category.total}</td>
                        <td>{category.average.toFixed(1)}</td>
                        <td>{category.xCount}</td>
                        <td>{category.tens}</td>
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
