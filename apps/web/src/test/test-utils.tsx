import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { EndpointConfig, ProxyLogEntry } from '@interceptr/shared';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: createWrapper(), ...options });
}

export { customRender as render };
export { screen, within, waitFor, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

export function createMockEndpoint(overrides?: Partial<EndpointConfig>): EndpointConfig {
  return {
    id: 'ep-1',
    specId: 'spec-1',
    method: 'GET',
    path: '/api/users',
    tags: [],
    mode: 'passthrough',
    ...overrides,
  };
}

export function createMockLogEntry(overrides?: Partial<ProxyLogEntry>): ProxyLogEntry {
  return {
    id: 'log-1',
    timestamp: '2025-01-01T12:00:00.000Z',
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    latencyMs: 42,
    mode: 'passthrough',
    ...overrides,
  };
}
