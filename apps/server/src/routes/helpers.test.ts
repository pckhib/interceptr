import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStore = vi.hoisted(() => ({
  getSpecs: vi.fn().mockReturnValue([]),
  getActiveEndpoints: vi.fn().mockReturnValue([]),
}));

const mockCompileRoutes = vi.hoisted(() => vi.fn());

vi.mock('../config/store.js', () => ({ store: mockStore }));
vi.mock('../proxy/matcher.js', () => ({ compileRoutes: mockCompileRoutes }));

import { recompileRoutes } from './helpers.js';

describe('recompileRoutes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls compileRoutes with active endpoints and a specs map', () => {
    const specs = [{ id: 'spec-1', active: true, name: 'API' }];
    const endpoints = [{ id: 'ep-1', specId: 'spec-1', mode: 'passthrough' }];
    mockStore.getSpecs.mockReturnValueOnce(specs);
    mockStore.getActiveEndpoints.mockReturnValueOnce(endpoints);

    recompileRoutes();

    expect(mockCompileRoutes).toHaveBeenCalledWith(
      endpoints,
      new Map([['spec-1', specs[0]]]),
    );
  });

  it('passes empty collections when there are no specs or endpoints', () => {
    recompileRoutes();
    expect(mockCompileRoutes).toHaveBeenCalledWith([], new Map());
  });

  it('builds the specs map from all specs regardless of active state', () => {
    const specs = [
      { id: 'spec-1', active: true },
      { id: 'spec-2', active: false },
    ];
    mockStore.getSpecs.mockReturnValueOnce(specs);

    recompileRoutes();

    const [, specsMap] = mockCompileRoutes.mock.calls[0];
    expect(specsMap.size).toBe(2);
    expect(specsMap.get('spec-1')).toBe(specs[0]);
    expect(specsMap.get('spec-2')).toBe(specs[1]);
  });
});
