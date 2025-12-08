import { useQuery } from '@tanstack/react-query';
import { fetchTournamentLeaderboard } from '../api/client';

export function useTournamentLeaderboard(tournamentId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['tournamentLeaderboard', tournamentId],
    queryFn: () => fetchTournamentLeaderboard(tournamentId),
    enabled,
    staleTime: 1000 * 60
  });
}
