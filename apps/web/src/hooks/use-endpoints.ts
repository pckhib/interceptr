import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EndpointConfig } from '@interceptr/shared';
import { api } from '@/lib/api';

export function useEndpoints() {
  return useQuery({
    queryKey: ['endpoints'],
    queryFn: api.endpoints.list,
  });
}

export function useUpdateEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: Partial<EndpointConfig> }) =>
      api.endpoints.update(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}

export function useBulkUpdateEndpoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, Partial<EndpointConfig>>) =>
      api.endpoints.bulkUpdate(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}
