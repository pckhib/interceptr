import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { useLogs, useLogStream } from './use-logs';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    logs: {
      get: vi.fn(),
      clear: vi.fn(),
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

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  onerror: (() => void) | null = null;
  readyState = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, cb: (event: MessageEvent) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  close() {
    this.readyState = 2;
  }

  // Test helper to simulate events
  emit(event: string, data?: string) {
    for (const cb of this.listeners[event] ?? []) {
      cb({ data } as MessageEvent);
    }
  }
}

describe('useLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches logs via api.logs.get', async () => {
    const mockResponse = { entries: [], total: 0 };
    mockedApi.logs.get.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse);
    expect(mockedApi.logs.get).toHaveBeenCalledOnce();
  });
});

describe('useLogStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Helper: render useLogStream and wait for the historical fetch to settle
  function renderLogStream() {
    const hook = renderHook(() => useLogStream(), { wrapper: createWrapper() });
    return hook;
  }

  it('fetches historical logs on mount', async () => {
    const mockEntry = {
      id: 'log-1',
      timestamp: '2025-01-01T12:00:00Z',
      method: 'GET',
      path: '/api/users',
      statusCode: 200,
      latencyMs: 42,
      mode: 'passthrough' as const,
    };
    mockedApi.logs.get.mockResolvedValue({ entries: [mockEntry], total: 1 });

    const { result } = renderLogStream();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('log-1');
    expect(mockedApi.logs.get).toHaveBeenCalledWith(500);
  });

  it('creates an EventSource to /api/logs/stream', async () => {
    mockedApi.logs.get.mockResolvedValue({ entries: [], total: 0 });

    const { result } = renderLogStream();

    // Wait for the historical fetch to settle so it doesn't update state after the test
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/logs/stream');
  });

  it('sets connected to true on "connected" event', async () => {
    mockedApi.logs.get.mockResolvedValue({ entries: [], total: 0 });

    const { result } = renderLogStream();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      MockEventSource.instances[0].emit('connected');
    });

    expect(result.current.connected).toBe(true);
  });

  it('adds new entries on "log" events', async () => {
    mockedApi.logs.get.mockResolvedValue({ entries: [], total: 0 });

    const { result } = renderLogStream();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const newEntry = {
      id: 'log-2',
      timestamp: '2025-01-01T12:01:00Z',
      method: 'POST',
      path: '/api/items',
      statusCode: 201,
      latencyMs: 100,
      mode: 'passthrough',
    };

    act(() => {
      MockEventSource.instances[0].emit('log', JSON.stringify(newEntry));
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('log-2');
  });

  it('sets connected to false on error', async () => {
    mockedApi.logs.get.mockResolvedValue({ entries: [], total: 0 });

    const { result } = renderLogStream();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      MockEventSource.instances[0].emit('connected');
    });
    expect(result.current.connected).toBe(true);

    act(() => {
      MockEventSource.instances[0].onerror?.();
    });
    expect(result.current.connected).toBe(false);
  });

  it('clears entries and calls api.logs.clear', async () => {
    mockedApi.logs.get.mockResolvedValue({ entries: [], total: 0 });
    mockedApi.logs.clear.mockResolvedValue({ message: 'cleared' });

    const { result } = renderLogStream();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    // Add an entry first
    act(() => {
      MockEventSource.instances[0].emit('log', JSON.stringify({
        id: 'log-1',
        timestamp: '2025-01-01T12:00:00Z',
        method: 'GET',
        path: '/test',
        statusCode: 200,
        latencyMs: 10,
        mode: 'passthrough',
      }));
    });
    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.clear();
    });

    expect(result.current.entries).toHaveLength(0);
    expect(mockedApi.logs.clear).toHaveBeenCalledOnce();
  });

  it('closes EventSource on unmount', async () => {
    mockedApi.logs.get.mockResolvedValue({ entries: [], total: 0 });

    const { result, unmount } = renderLogStream();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const es = MockEventSource.instances[0];
    unmount();
    expect(es.readyState).toBe(2);
  });
});
