import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EndpointConfig } from '@interceptr/shared';
import { api } from '@/lib/api';

export function usePresets() {
  return useQuery({
    queryKey: ['presets'],
    queryFn: api.presets.list,
  });
}

export function useCreatePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: { name: string; description?: string; endpoints: Record<string, Partial<EndpointConfig>> }) =>
      api.presets.create(preset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
  });
}

export function useDeletePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.presets.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
  });
}

export function useApplyPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.presets.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}
