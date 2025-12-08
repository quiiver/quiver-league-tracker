import TournamentCard from '../components/TournamentCard';
import { useTournaments } from '../hooks/useTournaments';

export default function HomePage(): JSX.Element {
  const { data, isLoading, isError, error } = useTournaments();

  if (isLoading) {
    return <p className="text-muted">Loading tournaments…</p>;
  }

  if (isError) {
    return <p className="text-muted">Error: {(error as Error).message}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted">No tournaments have been synced yet.</p>;
  }

  return (
    <section>
      <h1>League Overview</h1>
      <p className="text-muted">
        Explore synced tournaments and drill into live leaderboards.
      </p>
      <div className="card-grid">
        {data.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </section>
  );
}
