import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useSpecs,
  useUploadSpec,
  useUploadSpecFromUrl,
  useUpdateSpec,
  useToggleSpec,
  useReimportSpec,
  useDeleteSpec,
} from './use-specs';
import { api } from '@/lib/api';
import type { ProjectSpec } from '@interceptr/shared';

vi.mock('@/lib/api', () => ({
  api: {
    specs: {
      list: vi.fn(),
      upload: vi.fn(),
      uploadFromUrl: vi.fn(),
      update: vi.fn(),
      toggle: vi.fn(),
      reimport: vi.fn(),
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

const mockSpec: ProjectSpec = {
  id: 'spec-1',
  name: 'Petstore',
  upstreamUrl: 'https://api.example.com',
  active: true,
  metadata: {
    title: 'Petstore API',
    version: '1.0.0',
    endpointCount: 5,
    uploadedAt: '2025-01-01T00:00:00Z',
  },
};

describe('useSpecs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches specs via api.specs.list', async () => {
    mockedApi.specs.list.mockResolvedValue([mockSpec]);

    const { result } = renderHook(() => useSpecs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockSpec]);
  });
});

describe('useUploadSpec', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.specs.upload with spec, name, and upstreamUrl', async () => {
    mockedApi.specs.upload.mockResolvedValue({ spec: mockSpec, endpointCount: 5 });

    const { result } = renderHook(() => useUploadSpec(), { wrapper: createWrapper() });

    const specObj = { openapi: '3.0.0' };
    result.current.mutate({ spec: specObj, name: 'Petstore', upstreamUrl: 'https://api.example.com' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.specs.upload).toHaveBeenCalledWith(specObj, 'Petstore', 'https://api.example.com');
  });
});

describe('useUploadSpecFromUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.specs.uploadFromUrl with url and name', async () => {
    mockedApi.specs.uploadFromUrl.mockResolvedValue({ spec: mockSpec, endpointCount: 5 });

    const { result } = renderHook(() => useUploadSpecFromUrl(), { wrapper: createWrapper() });

    result.current.mutate({ url: 'https://example.com/spec.json', name: 'Petstore' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.specs.uploadFromUrl).toHaveBeenCalledWith('https://example.com/spec.json', 'Petstore');
  });
});

describe('useUpdateSpec', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.specs.update with specId and data', async () => {
    mockedApi.specs.update.mockResolvedValue(mockSpec);

    const { result } = renderHook(() => useUpdateSpec(), { wrapper: createWrapper() });

    result.current.mutate({ specId: 'spec-1', data: { name: 'Updated' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.specs.update).toHaveBeenCalledWith('spec-1', { name: 'Updated' });
  });
});

describe('useToggleSpec', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.specs.toggle with specId', async () => {
    mockedApi.specs.toggle.mockResolvedValue(mockSpec);

    const { result } = renderHook(() => useToggleSpec(), { wrapper: createWrapper() });

    result.current.mutate('spec-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.specs.toggle).toHaveBeenCalledWith('spec-1');
  });
});

describe('useReimportSpec', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.specs.reimport with specId and spec object', async () => {
    mockedApi.specs.reimport.mockResolvedValue({ spec: mockSpec, endpointCount: 5 });

    const { result } = renderHook(() => useReimportSpec(), { wrapper: createWrapper() });

    const specObj = { openapi: '3.0.0' };
    result.current.mutate({ specId: 'spec-1', spec: specObj });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.specs.reimport).toHaveBeenCalledWith('spec-1', specObj);
  });
});

describe('useDeleteSpec', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.specs.delete with specId', async () => {
    mockedApi.specs.delete.mockResolvedValue({ message: 'deleted' });

    const { result } = renderHook(() => useDeleteSpec(), { wrapper: createWrapper() });

    result.current.mutate('spec-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.specs.delete).toHaveBeenCalledWith('spec-1');
  });
});
