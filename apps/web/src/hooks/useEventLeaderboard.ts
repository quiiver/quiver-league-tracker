import { useQuery } from '@tanstack/react-query';
import { fetchEventLeaderboard } from '../api/client';

export function useEventLeaderboard(eventId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['eventLeaderboard', eventId],
    queryFn: () => fetchEventLeaderboard(eventId),
    enabled,
    staleTime: 1000 * 60
  });
}
