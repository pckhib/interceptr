import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePresets, useCreatePreset, useDeletePreset, useApplyPreset } from './use-presets';
import { api } from '@/lib/api';
import type { Preset } from '@interceptr/shared';

vi.mock('@/lib/api', () => ({
  api: {
    presets: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      apply: vi.fn(),
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

const mockPreset: Preset = {
  name: 'Slow All',
  endpoints: { 'ep-1': { mode: 'delay' } },
  createdAt: '2025-01-01T00:00:00Z',
};

describe('usePresets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches presets via api.presets.list', async () => {
    mockedApi.presets.list.mockResolvedValue([mockPreset]);

    const { result } = renderHook(() => usePresets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockPreset]);
  });
});

describe('useCreatePreset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.presets.create with preset data', async () => {
    mockedApi.presets.create.mockResolvedValue(mockPreset);

    const { result } = renderHook(() => useCreatePreset(), { wrapper: createWrapper() });

    const input = { name: 'Slow All', endpoints: { 'ep-1': { mode: 'delay' as const } } };
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.presets.create).toHaveBeenCalledWith(input);
  });
});

describe('useDeletePreset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.presets.delete with preset name', async () => {
    mockedApi.presets.delete.mockResolvedValue({ message: 'deleted' });

    const { result } = renderHook(() => useDeletePreset(), { wrapper: createWrapper() });

    result.current.mutate('Slow All');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.presets.delete).toHaveBeenCalled();
    expect(mockedApi.presets.delete.mock.calls[0][0]).toBe('Slow All');
  });
});

describe('useApplyPreset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.presets.apply with preset name', async () => {
    mockedApi.presets.apply.mockResolvedValue([]);

    const { result } = renderHook(() => useApplyPreset(), { wrapper: createWrapper() });

    result.current.mutate('Slow All');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.presets.apply).toHaveBeenCalled();
    expect(mockedApi.presets.apply.mock.calls[0][0]).toBe('Slow All');
  });
});
