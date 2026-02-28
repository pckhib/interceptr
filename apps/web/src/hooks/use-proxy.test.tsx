import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { useProxyStatus, useStartProxy, useStopProxy } from './use-proxy';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    proxy: {
      status: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
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

describe('useProxyStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches proxy status via api.proxy.status', async () => {
    mockedApi.proxy.status.mockResolvedValue({ running: true, port: 8080 });

    const { result } = renderHook(() => useProxyStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ running: true, port: 8080 });
  });
});

describe('useStartProxy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.proxy.start', async () => {
    mockedApi.proxy.start.mockResolvedValue({ running: true, port: 8080 });

    const { result } = renderHook(() => useStartProxy(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.proxy.start).toHaveBeenCalledOnce();
  });
});

describe('useStopProxy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.proxy.stop', async () => {
    mockedApi.proxy.stop.mockResolvedValue({ running: false, port: null });

    const { result } = renderHook(() => useStopProxy(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.proxy.stop).toHaveBeenCalledOnce();
  });
});
