import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SavedResponse } from '@interceptr/shared';

export function useSavedResponses() {
  return useQuery({ queryKey: ['saved-responses'], queryFn: api.savedResponses.list });
}

export function useCreateSavedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (response: Omit<SavedResponse, 'id' | 'createdAt'>) =>
      api.savedResponses.create(response),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-responses'] }),
  });
}

export function useUpdateSavedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<SavedResponse, 'id' | 'createdAt'> }) =>
      api.savedResponses.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-responses'] }),
  });
}

export function useDeleteSavedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.savedResponses.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-responses'] }),
  });
}
