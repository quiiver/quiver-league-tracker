import { useQuery } from '@tanstack/react-query';
import { fetchCanonicalArcherProfile } from '../api/client';

export function useCanonicalArcherProfile(canonicalArcherId: number, enabled = true) {
  return useQuery({
    queryKey: ['canonicalArcherProfile', canonicalArcherId],
    queryFn: () => fetchCanonicalArcherProfile(canonicalArcherId),
    enabled,
    staleTime: 1000 * 60
  });
}
