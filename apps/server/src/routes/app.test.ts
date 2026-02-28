import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock store and recompileRoutes before importing app ──────────────────────

const mockStore = vi.hoisted(() => ({
  getConfig: vi.fn().mockReturnValue({ proxyPort: 4000, activeProjectId: 'p1' }),
  setConfig: vi.fn().mockReturnValue({ proxyPort: 9090, activeProjectId: 'p1' }),
  exportData: vi.fn().mockReturnValue({ version: 2, specs: [], endpoints: [], presets: [], exportedAt: '' }),
  importData: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockReturnValue([]),
  createProject: vi.fn().mockReturnValue({ id: 'p-new', name: 'New', createdAt: '', updatedAt: '' }),
  getActiveProject: vi.fn().mockReturnValue({ id: 'p1', name: 'Active', createdAt: '', updatedAt: '', specs: [] }),
  switchProject: vi.fn().mockResolvedValue(true),
  renameProject: vi.fn().mockReturnValue({ id: 'p1', name: 'Renamed', createdAt: '', updatedAt: '' }),
  deleteProject: vi.fn().mockResolvedValue(true),
  getSpecs: vi.fn().mockReturnValue([]),
  addSpec: vi.fn(),
  updateSpec: vi.fn().mockReturnValue({ id: 'spec-1', active: true }),
  removeSpec: vi.fn().mockReturnValue(true),
  reimportSpec: vi.fn().mockReturnValue(true),
  getSpec: vi.fn().mockReturnValue(undefined),
  getEndpoints: vi.fn().mockReturnValue([]),
  getActiveEndpoints: vi.fn().mockReturnValue([]),
  setEndpoint: vi.fn().mockReturnValue({ id: 'ep-1', mode: 'passthrough' }),
  bulkUpdateEndpoints: vi.fn().mockReturnValue([]),
  getPresets: vi.fn().mockReturnValue([]),
  setPreset: vi.fn(),
  deletePreset: vi.fn().mockReturnValue(true),
  applyPreset: vi.fn().mockReturnValue([{ id: 'ep-1' }]),
}));

vi.mock('../config/store.js', () => ({ store: mockStore }));
vi.mock('./helpers.js', () => ({ recompileRoutes: vi.fn() }));
vi.mock('../proxy/lifecycle.js', () => ({
  getProxyStatus: vi.fn().mockReturnValue({ running: false, port: null }),
  startProxy: vi.fn().mockResolvedValue({ port: 4000 }),
  stopProxy: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../logging/ring-buffer.js', () => ({
  logBuffer: {
    getRecent: vi.fn().mockReturnValue([]),
    size: 0,
    clear: vi.fn(),
  },
}));
vi.mock('../logging/sse.js', () => ({
  sseEmitter: { addClient: vi.fn().mockReturnValue(vi.fn()), clientCount: 0 },
}));

import { app } from '../app.js';

async function json(res: Response) {
  return res.json();
}

describe('GET /api/health', () => {
  it('returns { status: ok }', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ data: { status: 'ok', version: expect.any(String) } });
  });
});

describe('Config routes /api/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / returns config', async () => {
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.proxyPort).toBe(4000);
  });

  it('PUT / updates config', async () => {
    const res = await app.request('/api/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ proxyPort: 9090 }),
    });
    expect(res.status).toBe(200);
    expect(mockStore.setConfig).toHaveBeenCalledWith({ proxyPort: 9090 });
  });

  it('GET /export returns export data', async () => {
    const res = await app.request('/api/config/export');
    expect(res.status).toBe(200);
    expect(mockStore.exportData).toHaveBeenCalled();
  });

  it('POST /import calls importData and returns success message', async () => {
    const res = await app.request('/api/config/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: 2, specs: [], endpoints: [], presets: [] }),
    });
    expect(res.status).toBe(200);
    expect(mockStore.importData).toHaveBeenCalled();
    const body = await json(res);
    expect(body.data.message).toMatch(/imported/i);
  });

  it('POST /import returns 400 when importData throws', async () => {
    mockStore.importData.mockRejectedValueOnce(new Error('bad data'));
    const res = await app.request('/api/config/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('Projects routes /api/projects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / returns project list', async () => {
    mockStore.listProjects.mockReturnValueOnce([
      { id: 'p1', name: 'Alpha', createdAt: '', updatedAt: '' },
    ]);
    const res = await app.request('/api/projects');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
  });

  it('POST / creates a new project', async () => {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Project' }),
    });
    expect(res.status).toBe(201);
    expect(mockStore.createProject).toHaveBeenCalledWith('New Project');
  });

  it('POST / returns 400 when name is missing', async () => {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /active returns active project', async () => {
    const res = await app.request('/api/projects/active');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.id).toBe('p1');
  });

  it('GET /active returns 404 when no active project', async () => {
    mockStore.getActiveProject.mockReturnValueOnce(null);
    const res = await app.request('/api/projects/active');
    expect(res.status).toBe(404);
  });

  it('PUT /active switches project', async () => {
    const res = await app.request('/api/projects/active', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: 'p2' }),
    });
    expect(res.status).toBe(200);
    expect(mockStore.switchProject).toHaveBeenCalledWith('p2');
  });

  it('PUT /active returns 404 for unknown project', async () => {
    mockStore.switchProject.mockResolvedValueOnce(false);
    const res = await app.request('/api/projects/active', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: 'ghost' }),
    });
    expect(res.status).toBe(404);
  });

  it('PUT /:id renames a project', async () => {
    const res = await app.request('/api/projects/p1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });
    expect(res.status).toBe(200);
    expect(mockStore.renameProject).toHaveBeenCalledWith('p1', 'Renamed');
  });

  it('PUT /:id returns 400 when name is blank', async () => {
    const res = await app.request('/api/projects/p1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /:id returns 404 when project not found', async () => {
    mockStore.renameProject.mockReturnValueOnce(undefined);
    const res = await app.request('/api/projects/ghost', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id deletes a project', async () => {
    const res = await app.request('/api/projects/p2', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(mockStore.deleteProject).toHaveBeenCalledWith('p2');
  });

  it('DELETE /:id returns 400 when deleting active project', async () => {
    mockStore.deleteProject.mockResolvedValueOnce(false);
    const res = await app.request('/api/projects/p1', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });
});

describe('Endpoints routes /api/endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / returns all endpoints', async () => {
    mockStore.getEndpoints.mockReturnValueOnce([{ id: 'ep-1', mode: 'passthrough' }]);
    const res = await app.request('/api/endpoints');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
  });

  it('GET /?specId= filters by specId', async () => {
    mockStore.getEndpoints.mockReturnValueOnce([
      { id: 'ep-1', specId: 'spec-1' },
      { id: 'ep-2', specId: 'spec-2' },
    ]);
    const res = await app.request('/api/endpoints?specId=spec-1');
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].specId).toBe('spec-1');
  });

  it('PUT /bulk updates endpoints in bulk', async () => {
    const res = await app.request('/api/endpoints/bulk', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 'ep-1': { mode: 'mock' } }),
    });
    expect(res.status).toBe(200);
    expect(mockStore.bulkUpdateEndpoints).toHaveBeenCalled();
  });

  it('PUT /:id updates a single endpoint', async () => {
    const res = await app.request('/api/endpoints/ep-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'delay' }),
    });
    expect(res.status).toBe(200);
    expect(mockStore.setEndpoint).toHaveBeenCalledWith('ep-1', { mode: 'delay' });
  });

  it('PUT /:id returns 404 when endpoint not found', async () => {
    mockStore.setEndpoint.mockReturnValueOnce(undefined);
    const res = await app.request('/api/endpoints/ghost', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'mock' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('Logs routes /api/logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / returns recent log entries', async () => {
    const { logBuffer } = await import('../logging/ring-buffer.js');
    (logBuffer.getRecent as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { id: 'log-1', method: 'GET', path: '/', statusCode: 200, latencyMs: 10, mode: 'passthrough', timestamp: '' },
    ]);
    const res = await app.request('/api/logs');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.entries).toHaveLength(1);
  });

  it('GET /?limit=5 passes limit to getRecent', async () => {
    const { logBuffer } = await import('../logging/ring-buffer.js');
    await app.request('/api/logs?limit=5');
    expect(logBuffer.getRecent).toHaveBeenCalledWith(5);
  });

  it('DELETE / clears logs', async () => {
    const { logBuffer } = await import('../logging/ring-buffer.js');
    const res = await app.request('/api/logs', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(logBuffer.clear).toHaveBeenCalled();
  });
});

describe('Presets routes /api/presets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / returns presets list', async () => {
    mockStore.getPresets.mockReturnValueOnce([
      { name: 'Slow', endpoints: {}, createdAt: '' },
    ]);
    const res = await app.request('/api/presets');
    const body = await json(res);
    expect(body.data).toHaveLength(1);
  });

  it('POST / creates a preset', async () => {
    const res = await app.request('/api/presets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Errors', endpoints: {} }),
    });
    expect(res.status).toBe(201);
    expect(mockStore.setPreset).toHaveBeenCalled();
  });

  it('DELETE /:name deletes a preset', async () => {
    const res = await app.request('/api/presets/Slow', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(mockStore.deletePreset).toHaveBeenCalledWith('Slow');
  });

  it('DELETE /:name returns 404 when not found', async () => {
    mockStore.deletePreset.mockReturnValueOnce(false);
    const res = await app.request('/api/presets/ghost', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('POST /:name/apply applies a preset', async () => {
    const res = await app.request('/api/presets/Slow/apply', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(mockStore.applyPreset).toHaveBeenCalledWith('Slow');
  });

  it('POST /:name/apply returns 404 when preset not found', async () => {
    mockStore.applyPreset.mockReturnValueOnce([]);
    const res = await app.request('/api/presets/ghost/apply', { method: 'POST' });
    expect(res.status).toBe(404);
  });
});

describe('Proxy routes /api/proxy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /status returns proxy status', async () => {
    const res = await app.request('/api/proxy/status');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveProperty('running');
  });

  it('POST /start starts the proxy', async () => {
    const res = await app.request('/api/proxy/start', { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('POST /stop stops the proxy', async () => {
    const res = await app.request('/api/proxy/stop', { method: 'POST' });
    expect(res.status).toBe(200);
  });
});
