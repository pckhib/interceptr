import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProxyStatus() {
  return useQuery({
    queryKey: ['proxyStatus'],
    queryFn: api.proxy.status,
    refetchInterval: 5000,
  });
}

export function useStartProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.proxy.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxyStatus'] });
    },
  });
}

export function useStopProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.proxy.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxyStatus'] });
    },
  });
}
