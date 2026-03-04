import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useSavedResponses,
  useCreateSavedResponse,
  useUpdateSavedResponse,
  useDeleteSavedResponse,
} from './use-saved-responses';
import { api } from '@/lib/api';
import type { SavedResponse } from '@interceptr/shared';

vi.mock('@/lib/api', () => ({
  api: {
    savedResponses: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockedApi = vi.mocked(api, { deep: true });

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockResponse: SavedResponse = {
  id: 'resp-1',
  name: 'Test Response',
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: '{"ok":true}',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('useSavedResponses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches saved responses via api.savedResponses.list', async () => {
    mockedApi.savedResponses.list.mockResolvedValue([mockResponse]);
    const { result } = renderHook(() => useSavedResponses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockResponse]);
  });
});

describe('useCreateSavedResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.savedResponses.create with the response data', async () => {
    mockedApi.savedResponses.create.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useCreateSavedResponse(), { wrapper: createWrapper() });
    const { id: _id, createdAt: _createdAt, ...data } = mockResponse;
    result.current.mutate(data);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.savedResponses.create).toHaveBeenCalledWith(data);
  });
});

describe('useUpdateSavedResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.savedResponses.update with id and data', async () => {
    mockedApi.savedResponses.update.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useUpdateSavedResponse(), { wrapper: createWrapper() });
    const { id, createdAt: _createdAt, ...data } = mockResponse;
    result.current.mutate({ id, data });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.savedResponses.update).toHaveBeenCalledWith(id, data);
  });
});

describe('useDeleteSavedResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.savedResponses.delete with id', async () => {
    mockedApi.savedResponses.delete.mockResolvedValue({ message: 'deleted' });
    const { result } = renderHook(() => useDeleteSavedResponse(), { wrapper: createWrapper() });
    result.current.mutate('resp-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.savedResponses.delete).toHaveBeenCalledWith('resp-1');
  });
});
