import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEndpoints, useUpdateEndpoint, useBulkUpdateEndpoints } from './use-endpoints';
import { api } from '@/lib/api';
import type { EndpointConfig } from '@interceptr/shared';

vi.mock('@/lib/api', () => ({
  api: {
    endpoints: {
      list: vi.fn(),
      update: vi.fn(),
      bulkUpdate: vi.fn(),
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

const mockEndpoint: EndpointConfig = {
  id: 'ep-1',
  specId: 'spec-1',
  method: 'GET',
  path: '/api/users',
  tags: [],
  mode: 'passthrough',
};

describe('useEndpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches endpoints via api.endpoints.list', async () => {
    mockedApi.endpoints.list.mockResolvedValue([mockEndpoint]);

    const { result } = renderHook(() => useEndpoints(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockEndpoint]);
    expect(mockedApi.endpoints.list).toHaveBeenCalledOnce();
  });
});

describe('useUpdateEndpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls api.endpoints.update with id and config', async () => {
    const updated = { ...mockEndpoint, mode: 'delay' as const };
    mockedApi.endpoints.update.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateEndpoint(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'ep-1', config: { mode: 'delay' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.endpoints.update).toHaveBeenCalledWith('ep-1', { mode: 'delay' });
  });
});

describe('useBulkUpdateEndpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls api.endpoints.bulkUpdate with updates map', async () => {
    mockedApi.endpoints.bulkUpdate.mockResolvedValue([mockEndpoint]);

    const updates = { 'ep-1': { mode: 'delay' as const } };
    const { result } = renderHook(() => useBulkUpdateEndpoints(), { wrapper: createWrapper() });

    result.current.mutate(updates);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.endpoints.bulkUpdate).toHaveBeenCalledWith(updates);
  });
});
