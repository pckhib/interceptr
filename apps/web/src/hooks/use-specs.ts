import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSpecs() {
  return useQuery({
    queryKey: ['specs'],
    queryFn: api.specs.list,
  });
}

export function useUploadSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spec, name, upstreamUrl }: { spec: object; name: string; upstreamUrl?: string }) =>
      api.specs.upload(spec, name, upstreamUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}

export function useUploadSpecFromUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ url, name }: { url: string; name: string }) =>
      api.specs.uploadFromUrl(url, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}

export function useUpdateSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      specId,
      data,
    }: {
      specId: string;
      data: { name?: string; upstreamUrl?: string; active?: boolean; globalHeaders?: Record<string, string> };
    }) => api.specs.update(specId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}

export function useToggleSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specId: string) => api.specs.toggle(specId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}

export function useReimportSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ specId, spec }: { specId: string; spec?: object }) =>
      api.specs.reimport(specId, spec),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}

export function useDeleteSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specId: string) => api.specs.delete(specId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}
