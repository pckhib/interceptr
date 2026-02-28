import { describe, it, expect, vi } from 'vitest';

// Make existsSync return true so the serveStatic branch in app.ts is covered
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('./version.js', () => ({ version: '1.0.0' }));

vi.mock('@hono/node-server/serve-static', () => ({
  serveStatic: vi.fn().mockReturnValue(async (_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock('./config/store.js', () => ({
  store: {
    getConfig: vi.fn().mockReturnValue({ proxyPort: 4000, activeProjectId: null }),
    setConfig: vi.fn().mockReturnValue({ proxyPort: 4000, activeProjectId: null }),
    exportData: vi.fn().mockReturnValue({}),
    importData: vi.fn().mockResolvedValue(undefined),
    listProjects: vi.fn().mockReturnValue([]),
    createProject: vi.fn(),
    getActiveProject: vi.fn().mockReturnValue(null),
    switchProject: vi.fn().mockResolvedValue(true),
    renameProject: vi.fn(),
    deleteProject: vi.fn().mockResolvedValue(true),
    getSpecs: vi.fn().mockReturnValue([]),
    addSpec: vi.fn(),
    updateSpec: vi.fn(),
    removeSpec: vi.fn(),
    reimportSpec: vi.fn(),
    getSpec: vi.fn(),
    getEndpoints: vi.fn().mockReturnValue([]),
    getActiveEndpoints: vi.fn().mockReturnValue([]),
    setEndpoint: vi.fn(),
    bulkUpdateEndpoints: vi.fn().mockReturnValue([]),
    getPresets: vi.fn().mockReturnValue([]),
    setPreset: vi.fn(),
    deletePreset: vi.fn().mockReturnValue(false),
    applyPreset: vi.fn().mockReturnValue([]),
    getPreset: vi.fn(),
  },
}));

vi.mock('./proxy/lifecycle.js', () => ({
  getProxyStatus: vi.fn().mockReturnValue({ running: false, port: null }),
  startProxy: vi.fn().mockResolvedValue({ port: 4000 }),
  stopProxy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./logging/ring-buffer.js', () => ({
  logBuffer: { getRecent: vi.fn().mockReturnValue([]), size: 0, clear: vi.fn() },
}));

vi.mock('./logging/sse.js', () => ({
  sseEmitter: { addClient: vi.fn().mockReturnValue(vi.fn()), clientCount: 0 },
}));

vi.mock('./routes/helpers.js', () => ({ recompileRoutes: vi.fn() }));
vi.mock('./openapi/parser.js', () => ({ parseOpenAPISpec: vi.fn() }));
vi.mock('nanoid', () => ({ nanoid: vi.fn().mockReturnValue('test-id') }));

import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app.js';

describe('app when publicDir exists', () => {
  it('registers serveStatic middleware', () => {
    expect(vi.mocked(serveStatic)).toHaveBeenCalled();
  });

  it('still serves the health endpoint', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });
});
