import { api } from './api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(ok ? { data } : { error: data }),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('api internal request helper', () => {
  it('sends GET requests with Content-Type header', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));

    await api.projects.list();

    expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('returns data from the response envelope', async () => {
    const projects = [{ id: 'p1', name: 'Test' }];
    mockFetch.mockResolvedValue(mockResponse(projects));

    const result = await api.projects.list();
    expect(result).toEqual(projects);
  });

  it('throws an error with the server error message on failure', async () => {
    mockFetch.mockResolvedValue(mockResponse('Not found', false, 404));

    await expect(api.projects.list()).rejects.toThrow('Not found');
  });

  it('throws a fallback error when no error message is provided', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(api.projects.list()).rejects.toThrow('Request failed: 500');
  });
});

describe('api.projects', () => {
  it('create sends POST with name', async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: 'p1', name: 'New' }));

    await api.projects.create('New');

    expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getActive calls /projects/active', async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: 'p1', specs: [] }));

    await api.projects.getActive();

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/active', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('switchActive sends PUT with projectId', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await api.projects.switchActive('p2');

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/active', {
      method: 'PUT',
      body: JSON.stringify({ projectId: 'p2' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('rename sends PUT with name', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await api.projects.rename('p1', 'Renamed');

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/p1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('delete sends DELETE', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'ok' }));

    await api.projects.delete('p1');

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/p1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('api.endpoints', () => {
  it('list calls /endpoints', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));

    await api.endpoints.list();

    expect(mockFetch).toHaveBeenCalledWith('/api/endpoints', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('update sends PUT with encoded id', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await api.endpoints.update('GET /api/users', { mode: 'delay' });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/endpoints/${encodeURIComponent('GET /api/users')}`,
      {
        method: 'PUT',
        body: JSON.stringify({ mode: 'delay' }),
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

  it('bulkUpdate sends PUT to /endpoints/bulk', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const updates = { ep1: { mode: 'mock' as const } };

    await api.endpoints.bulkUpdate(updates);

    expect(mockFetch).toHaveBeenCalledWith('/api/endpoints/bulk', {
      method: 'PUT',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('api.specs', () => {
  it('list calls /specs', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    await api.specs.list();
    expect(mockFetch).toHaveBeenCalledWith('/api/specs', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('upload sends POST with spec, name, and upstreamUrl', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));
    const spec = { openapi: '3.0.0' };

    await api.specs.upload(spec, 'Petstore', 'https://api.example.com');

    expect(mockFetch).toHaveBeenCalledWith('/api/specs', {
      method: 'POST',
      body: JSON.stringify({ spec, name: 'Petstore', upstreamUrl: 'https://api.example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('uploadFromUrl sends POST with url and name', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await api.specs.uploadFromUrl('https://example.com/spec.json', 'Petstore');

    expect(mockFetch).toHaveBeenCalledWith('/api/specs/url', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/spec.json', name: 'Petstore' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('toggle sends PUT to /specs/:id/toggle', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await api.specs.toggle('spec-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/specs/spec-1/toggle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('reimport sends POST with spec body when provided', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));
    const spec = { openapi: '3.0.0' };

    await api.specs.reimport('spec-1', spec);

    expect(mockFetch).toHaveBeenCalledWith('/api/specs/spec-1/reimport', {
      method: 'POST',
      body: JSON.stringify({ spec }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('reimport sends empty body when spec is not provided', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    await api.specs.reimport('spec-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/specs/spec-1/reimport', {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('delete sends DELETE', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'ok' }));

    await api.specs.delete('spec-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/specs/spec-1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('api.config', () => {
  it('get calls /config', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));
    await api.config.get();
    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('update sends PUT', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));
    await api.config.update({ proxyPort: 9090 });
    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      method: 'PUT',
      body: JSON.stringify({ proxyPort: 9090 }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('export calls /config/export', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));
    await api.config.export();
    expect(mockFetch).toHaveBeenCalledWith('/api/config/export', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('import sends POST', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'ok' }));
    await api.config.import({ version: 1 });
    expect(mockFetch).toHaveBeenCalledWith('/api/config/import', {
      method: 'POST',
      body: JSON.stringify({ version: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('api.logs', () => {
  it('get calls /logs with default limit', async () => {
    mockFetch.mockResolvedValue(mockResponse({ entries: [], total: 0 }));
    await api.logs.get();
    expect(mockFetch).toHaveBeenCalledWith('/api/logs?limit=100', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('get calls /logs with custom limit', async () => {
    mockFetch.mockResolvedValue(mockResponse({ entries: [], total: 0 }));
    await api.logs.get(500);
    expect(mockFetch).toHaveBeenCalledWith('/api/logs?limit=500', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('clear sends DELETE to /logs', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'ok' }));
    await api.logs.clear();
    expect(mockFetch).toHaveBeenCalledWith('/api/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('api.proxy', () => {
  it('status calls /proxy/status', async () => {
    mockFetch.mockResolvedValue(mockResponse({ running: true, port: 8080 }));
    const result = await api.proxy.status();
    expect(result).toEqual({ running: true, port: 8080 });
  });

  it('start sends POST to /proxy/start', async () => {
    mockFetch.mockResolvedValue(mockResponse({ running: true, port: 8080 }));
    await api.proxy.start();
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('stop sends POST to /proxy/stop', async () => {
    mockFetch.mockResolvedValue(mockResponse({ running: false, port: null }));
    await api.proxy.stop();
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('api.presets', () => {
  it('list calls /presets', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    await api.presets.list();
    expect(mockFetch).toHaveBeenCalledWith('/api/presets', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('create sends POST', async () => {
    mockFetch.mockResolvedValue(mockResponse({}));
    const preset = { name: 'Test', endpoints: {} };
    await api.presets.create(preset);
    expect(mockFetch).toHaveBeenCalledWith('/api/presets', {
      method: 'POST',
      body: JSON.stringify(preset),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('delete sends DELETE with encoded name', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'ok' }));
    await api.presets.delete('Slow All');
    expect(mockFetch).toHaveBeenCalledWith(`/api/presets/${encodeURIComponent('Slow All')}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('apply sends POST with encoded name', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    await api.presets.apply('Slow All');
    expect(mockFetch).toHaveBeenCalledWith(`/api/presets/${encodeURIComponent('Slow All')}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
