import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useProjects,
  useActiveProject,
  useCreateProject,
  useSwitchProject,
  useRenameProject,
  useDeleteProject,
} from './use-projects';
import { api } from '@/lib/api';
import type { Project } from '@interceptr/shared';

vi.mock('@/lib/api', () => ({
  api: {
    projects: {
      list: vi.fn(),
      getActive: vi.fn(),
      create: vi.fn(),
      switchActive: vi.fn(),
      rename: vi.fn(),
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

const mockProject: Project = {
  id: 'p1',
  name: 'My Project',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('useProjects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches projects via api.projects.list', async () => {
    mockedApi.projects.list.mockResolvedValue([mockProject]);

    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockProject]);
  });
});

describe('useActiveProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the active project via api.projects.getActive', async () => {
    mockedApi.projects.getActive.mockResolvedValue({ ...mockProject, specs: [] });

    const { result } = renderHook(() => useActiveProject(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ ...mockProject, specs: [] });
  });
});

describe('useCreateProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.projects.create with the name', async () => {
    mockedApi.projects.create.mockResolvedValue(mockProject);

    const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

    result.current.mutate('My Project');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.projects.create).toHaveBeenCalledWith('My Project');
  });
});

describe('useSwitchProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.projects.switchActive with the project id', async () => {
    mockedApi.projects.switchActive.mockResolvedValue({ ...mockProject, specs: [] });

    const { result } = renderHook(() => useSwitchProject(), { wrapper: createWrapper() });

    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.projects.switchActive).toHaveBeenCalledWith('p1');
  });
});

describe('useRenameProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.projects.rename with id and name', async () => {
    mockedApi.projects.rename.mockResolvedValue({ ...mockProject, name: 'Renamed' });

    const { result } = renderHook(() => useRenameProject(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'p1', name: 'Renamed' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.projects.rename).toHaveBeenCalledWith('p1', 'Renamed');
  });
});

describe('useDeleteProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.projects.delete with the id', async () => {
    mockedApi.projects.delete.mockResolvedValue({ message: 'deleted' });

    const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApi.projects.delete).toHaveBeenCalledWith('p1');
  });
});
