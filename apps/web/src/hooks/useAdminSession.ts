import { useQuery } from '@tanstack/react-query';
import { fetchAdminSession } from '../api/client';

export function useAdminSession() {
  return useQuery({
    queryKey: ['admin', 'session'],
    queryFn: fetchAdminSession,
    staleTime: 60_000,
    retry: false
  });
}
