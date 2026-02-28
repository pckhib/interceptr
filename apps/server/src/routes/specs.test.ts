import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockStore = vi.hoisted(() => ({
  getSpecs: vi.fn().mockReturnValue([]),
  addSpec: vi.fn(),
  getSpec: vi.fn().mockReturnValue(undefined),
  updateSpec: vi.fn().mockReturnValue(undefined),
  removeSpec: vi.fn().mockReturnValue(false),
  reimportSpec: vi.fn(),
}));

const mockParseOpenAPISpec = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    metadata: { title: 'Test API', version: '1.0' },
    endpoints: [{ id: 'GET:/users', method: 'GET', path: '/users', tags: [], responses: {} }],
  }),
);

const mockRecompileRoutes = vi.hoisted(() => vi.fn());
const mockNanoid = vi.hoisted(() => vi.fn().mockReturnValue('spec-123'));

vi.mock('../config/store.js', () => ({ store: mockStore }));
vi.mock('../openapi/parser.js', () => ({ parseOpenAPISpec: mockParseOpenAPISpec }));
vi.mock('./helpers.js', () => ({ recompileRoutes: mockRecompileRoutes }));
vi.mock('nanoid', () => ({ nanoid: mockNanoid }));

import specs from './specs.js';

async function json(res: Response) {
  return res.json();
}

describe('Specs routes', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  describe('GET /', () => {
    it('returns all specs', async () => {
      mockStore.getSpecs.mockReturnValueOnce([{ id: 'spec-1', name: 'My API', active: true }]);
      const res = await specs.request('/');
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data).toHaveLength(1);
    });

    it('returns empty array when no specs', async () => {
      const res = await specs.request('/');
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data).toEqual([]);
    });
  });

  describe('POST /', () => {
    it('creates a spec from JSON body', async () => {
      const res = await specs.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: {}, name: 'My API', upstreamUrl: 'http://api.example.com' }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data.spec.name).toBe('My API');
      expect(body.data.spec.upstreamUrl).toBe('http://api.example.com');
      expect(body.data.endpointCount).toBe(1);
      expect(mockStore.addSpec).toHaveBeenCalled();
      expect(mockRecompileRoutes).toHaveBeenCalled();
    });

    it('uses http://localhost:8080 as default upstreamUrl', async () => {
      const res = await specs.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: {}, name: 'My API' }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data.spec.upstreamUrl).toBe('http://localhost:8080');
    });

    it('prefixes endpoint ids with specId and sets specId field', async () => {
      await specs.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: {}, name: 'My API' }),
      });
      const [, endpointsArg] = (mockStore.addSpec as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(endpointsArg[0].id).toBe('spec-123:GET:/users');
      expect(endpointsArg[0].specId).toBe('spec-123');
    });

    it('returns 400 when name is missing', async () => {
      const res = await specs.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: {} }),
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error).toMatch(/name/i);
    });

    it('returns 400 when name is blank', async () => {
      const res = await specs.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: {}, name: '   ' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when parseOpenAPISpec throws', async () => {
      mockParseOpenAPISpec.mockRejectedValueOnce(new Error('Invalid spec'));
      const res = await specs.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: {}, name: 'Bad API' }),
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error).toBe('Invalid spec');
    });
  });

  describe('POST /url', () => {
    it('returns 400 when name is missing', async () => {
      const res = await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'http://example.com/spec.json' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for a non-http URL', async () => {
      const res = await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'ftp://example.com/spec', name: 'API' }),
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error).toMatch(/url/i);
    });

    it('fetches and imports a JSON spec', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ openapi: '3.0.0' })),
        headers: { get: () => 'application/json' },
      }));

      const res = await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'http://example.com/spec.json', name: 'Remote API' }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data.spec.name).toBe('Remote API');
      expect(body.data.spec.upstreamUrl).toBe('http://example.com');
    });

    it('fetches and imports a YAML spec by content-type', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('openapi: "3.0.0"'),
        headers: { get: () => 'application/x-yaml' },
      }));

      const res = await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'http://example.com/spec', name: 'YAML API' }),
      });
      expect(res.status).toBe(200);
    });

    it('detects YAML by .yaml extension in URL', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('openapi: "3.0.0"'),
        headers: { get: () => 'text/plain' },
      }));

      const res = await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'http://example.com/spec.yaml', name: 'YAML API' }),
      });
      expect(res.status).toBe(200);
    });

    it('sets metadata.sourceUrl to the provided URL', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
        headers: { get: () => 'application/json' },
      }));

      await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'http://api.example.com/openapi.json', name: 'API' }),
      });

      const [specArg] = (mockStore.addSpec as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(specArg.metadata.sourceUrl).toBe('http://api.example.com/openapi.json');
    });

    it('returns 400 when fetch responds with a non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }));

      const res = await specs.request('/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'http://example.com/spec.json', name: 'API' }),
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error).toMatch(/404/);
    });
  });

  describe('POST /:specId/reimport', () => {
    it('returns 404 when spec does not exist', async () => {
      const res = await specs.request('/spec-999/reimport', { method: 'POST' });
      expect(res.status).toBe(404);
    });

    it('reimports using a spec body provided in the request', async () => {
      mockStore.getSpec
        .mockReturnValueOnce({ id: 'spec-1', metadata: {} })
        .mockReturnValueOnce({ id: 'spec-1', name: 'Updated' });

      const res = await specs.request('/spec-1/reimport', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: { openapi: '3.0.0' } }),
      });
      expect(res.status).toBe(200);
      expect(mockStore.reimportSpec).toHaveBeenCalled();
      expect(mockRecompileRoutes).toHaveBeenCalled();
    });

    it('returns 400 when body is empty and spec has no sourceUrl', async () => {
      mockStore.getSpec.mockReturnValueOnce({ id: 'spec-1', metadata: {} });

      const res = await specs.request('/spec-1/reimport', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error).toMatch(/source url/i);
    });

    it('returns 400 when no content-type and spec has no sourceUrl', async () => {
      mockStore.getSpec.mockReturnValueOnce({ id: 'spec-1', metadata: {} });

      const res = await specs.request('/spec-1/reimport', { method: 'POST' });
      expect(res.status).toBe(400);
    });

    it('re-fetches from sourceUrl when no body is provided', async () => {
      mockStore.getSpec
        .mockReturnValueOnce({ id: 'spec-1', metadata: { sourceUrl: 'http://example.com/spec.json' } })
        .mockReturnValueOnce({ id: 'spec-1', name: 'Reimported' });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
        headers: { get: () => 'application/json' },
      }));

      const res = await specs.request('/spec-1/reimport', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      expect(mockStore.reimportSpec).toHaveBeenCalled();
    });

    it('returns 400 when re-fetch fails', async () => {
      mockStore.getSpec.mockReturnValueOnce({
        id: 'spec-1',
        metadata: { sourceUrl: 'http://example.com/spec.json' },
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      }));

      const res = await specs.request('/spec-1/reimport', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('preserves sourceUrl in metadata after reimport', async () => {
      const sourceUrl = 'http://example.com/spec.json';
      mockStore.getSpec
        .mockReturnValueOnce({ id: 'spec-1', metadata: { sourceUrl } })
        .mockReturnValueOnce({ id: 'spec-1', metadata: { sourceUrl } });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
        headers: { get: () => 'application/json' },
      }));

      await specs.request('/spec-1/reimport', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const [, , endpointsArg] = (mockStore.reimportSpec as ReturnType<typeof vi.fn>).mock.calls[0];
      // metadata passed to reimportSpec should have sourceUrl preserved
      const [, metadataArg] = (mockStore.reimportSpec as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(metadataArg.sourceUrl).toBe(sourceUrl);
    });
  });

  describe('PUT /:specId', () => {
    it('updates a spec and calls recompileRoutes', async () => {
      mockStore.updateSpec.mockReturnValueOnce({ id: 'spec-1', name: 'Updated API' });

      const res = await specs.request('/spec-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated API' }),
      });
      expect(res.status).toBe(200);
      expect(mockStore.updateSpec).toHaveBeenCalledWith('spec-1', { name: 'Updated API' });
      expect(mockRecompileRoutes).toHaveBeenCalled();
    });

    it('returns 404 when spec not found', async () => {
      const res = await specs.request('/ghost', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /:specId/toggle', () => {
    it('toggles active from true to false', async () => {
      mockStore.getSpec.mockReturnValueOnce({ id: 'spec-1', active: true });
      mockStore.updateSpec.mockReturnValueOnce({ id: 'spec-1', active: false });

      const res = await specs.request('/spec-1/toggle', { method: 'PUT' });
      expect(res.status).toBe(200);
      expect(mockStore.updateSpec).toHaveBeenCalledWith('spec-1', { active: false });
      expect(mockRecompileRoutes).toHaveBeenCalled();
    });

    it('toggles active from false to true', async () => {
      mockStore.getSpec.mockReturnValueOnce({ id: 'spec-1', active: false });
      mockStore.updateSpec.mockReturnValueOnce({ id: 'spec-1', active: true });

      const res = await specs.request('/spec-1/toggle', { method: 'PUT' });
      expect(res.status).toBe(200);
      expect(mockStore.updateSpec).toHaveBeenCalledWith('spec-1', { active: true });
    });

    it('returns 404 when spec not found', async () => {
      const res = await specs.request('/ghost/toggle', { method: 'PUT' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:specId', () => {
    it('deletes a spec and calls recompileRoutes', async () => {
      mockStore.removeSpec.mockReturnValueOnce(true);

      const res = await specs.request('/spec-1', { method: 'DELETE' });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data.message).toMatch(/deleted/i);
      expect(mockStore.removeSpec).toHaveBeenCalledWith('spec-1');
      expect(mockRecompileRoutes).toHaveBeenCalled();
    });

    it('returns 404 when spec not found', async () => {
      const res = await specs.request('/ghost', { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });
});
