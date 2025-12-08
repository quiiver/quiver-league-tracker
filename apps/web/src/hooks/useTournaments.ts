import { useQuery } from '@tanstack/react-query';
import { fetchTournaments } from '../api/client';

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
    staleTime: 1000 * 60 * 5
  });
}
