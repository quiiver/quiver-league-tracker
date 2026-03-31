import { useMemo } from 'react';
import TournamentCard from '../components/TournamentCard';
import { useTournaments } from '../hooks/useTournaments';
import { sortTournamentsByStartDateDesc } from '../utils/tournamentSort';

export default function HomePage(): JSX.Element {
  const { data, isLoading, isError, error } = useTournaments();
  const tournaments = useMemo(() => sortTournamentsByStartDateDesc(data ?? []), [data]);

  if (isLoading) {
    return <p className="text-muted">Loading tournaments…</p>;
  }

  if (isError) {
    return <p className="text-muted">Error: {(error as Error).message}</p>;
  }

  if (tournaments.length === 0) {
    return <p className="text-muted">No tournaments have been synced yet.</p>;
  }

  return (
    <section>
      <h1>League Overview</h1>
      <p className="text-muted">
        Explore synced tournaments, open each tournament dashboard, and drill into category and archer records.
      </p>
      <div className="card-grid">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </section>
  );
}
