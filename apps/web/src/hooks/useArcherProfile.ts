import { useQuery } from '@tanstack/react-query';
import { fetchArcherProfile } from '../api/client';

export function useArcherProfile(archerId: number, tournamentId?: number, enabled = true) {
  return useQuery({
    queryKey: ['archerProfile', archerId, tournamentId ?? null],
    queryFn: () => fetchArcherProfile(archerId, tournamentId),
    enabled,
    staleTime: 1000 * 60
  });
}
