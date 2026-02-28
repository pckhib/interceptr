import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EndpointConfig } from '@interceptr/shared';

// ── Mocks (hoisted) ─────────────────────────────────────────────────────────

const { mockMatchRequest, mockGetDefaultUpstreamUrl, mockLogBufferPush, mockSseEmit } = vi.hoisted(() => ({
  mockMatchRequest: vi.fn(),
  mockGetDefaultUpstreamUrl: vi.fn(),
  mockLogBufferPush: vi.fn(),
  mockSseEmit: vi.fn(),
}));

vi.mock('./matcher.js', () => ({
  matchRequest: mockMatchRequest,
  getDefaultUpstreamUrl: mockGetDefaultUpstreamUrl,
}));

vi.mock('../logging/ring-buffer.js', () => ({
  logBuffer: { push: mockLogBufferPush },
}));

vi.mock('../logging/sse.js', () => ({
  sseEmitter: { emit: mockSseEmit },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Import after mocks ────────────────────────────────────────────────────────
import { handleProxyRequest } from './handler.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEndpoint(overrides: Partial<EndpointConfig> = {}): EndpointConfig {
  return {
    id: 'ep-1',
    specId: 'spec-1',
    method: 'GET',
    path: '/users',
    tags: [],
    mode: 'passthrough',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<{ method: string; url: string; body: null }> = {}): Request {
  return new Request(overrides.url ?? 'http://proxy.local/users', {
    method: overrides.method ?? 'GET',
  });
}

function makeUpstreamResponse(status = 200, body = '{"ok":true}'): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('handleProxyRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefaultUpstreamUrl.mockReturnValue(null);
  });

  // ── Mock mode ─────────────────────────────────────────────────────────────

  describe('mock mode', () => {
    it('returns the mocked status code and body', async () => {
      const ep = makeEndpoint({
        mode: 'mock',
        mock: { statusCode: 201, headers: { 'x-custom': 'yes' }, body: '{"created":true}' },
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(201);
      expect(await res.text()).toBe('{"created":true}');
    });

    it('includes custom headers from mock config', async () => {
      const ep = makeEndpoint({
        mode: 'mock',
        mock: { statusCode: 200, headers: { 'x-mock': 'true' }, body: '' },
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      const res = await handleProxyRequest(makeRequest());
      expect(res.headers.get('x-mock')).toBe('true');
    });

    it('adds content-type: application/json if not set in mock headers', async () => {
      const ep = makeEndpoint({
        mode: 'mock',
        mock: { statusCode: 200, headers: {}, body: '{}' },
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      const res = await handleProxyRequest(makeRequest());
      expect(res.headers.get('content-type')).toBe('application/json');
    });

    it('does not override a content-type already set in mock headers', async () => {
      const ep = makeEndpoint({
        mode: 'mock',
        mock: { statusCode: 200, headers: { 'content-type': 'text/plain' }, body: 'hello' },
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      const res = await handleProxyRequest(makeRequest());
      expect(res.headers.get('content-type')).toBe('text/plain');
    });
  });

  // ── Passthrough mode ──────────────────────────────────────────────────────

  describe('passthrough mode', () => {
    it('forwards request to upstream and returns its response', async () => {
      const ep = makeEndpoint({ mode: 'passthrough' });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockResolvedValue(makeUpstreamResponse(200, '{"data":[]}'));

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('{"data":[]}');
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('removes the host header before forwarding', async () => {
      const ep = makeEndpoint({ mode: 'passthrough' });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockResolvedValue(makeUpstreamResponse());

      const req = new Request('http://proxy.local/users', {
        headers: { host: 'proxy.local', accept: 'application/json' },
      });
      await handleProxyRequest(req);

      const forwarded = mockFetch.mock.calls[0][0] as Request;
      expect(forwarded.headers.get('host')).toBeNull();
      expect(forwarded.headers.get('accept')).toBe('application/json');
    });

    it('constructs the target URL from upstreamUrl + path + query string', async () => {
      const ep = makeEndpoint({ mode: 'passthrough' });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockResolvedValue(makeUpstreamResponse());

      await handleProxyRequest(new Request('http://proxy.local/users?page=2'));

      const forwarded = mockFetch.mock.calls[0][0] as Request;
      expect(forwarded.url).toBe('https://api.example.com/users?page=2');
    });
  });

  // ── Delay mode ────────────────────────────────────────────────────────────

  describe('delay mode', () => {
    it('calls sleep before forwarding (delay > 0)', async () => {
      vi.useFakeTimers();
      const ep = makeEndpoint({ mode: 'delay', delay: { ms: 500 } });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockResolvedValue(makeUpstreamResponse());

      const promise = handleProxyRequest(makeRequest());
      // Advance past the delay
      await vi.advanceTimersByTimeAsync(600);
      await promise;

      expect(mockFetch).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });
  });

  // ── No upstream ───────────────────────────────────────────────────────────

  describe('no upstream configured', () => {
    it('returns 502 when no match and no default upstream', async () => {
      mockMatchRequest.mockReturnValue(undefined);
      mockGetDefaultUpstreamUrl.mockReturnValue(null);

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toMatch(/No matching endpoint/);
    });

    it('uses defaultUpstreamUrl when there is no endpoint match', async () => {
      mockMatchRequest.mockReturnValue(undefined);
      mockGetDefaultUpstreamUrl.mockReturnValue('https://fallback.api.com');
      mockFetch.mockResolvedValue(makeUpstreamResponse());

      await handleProxyRequest(new Request('http://proxy.local/anything'));

      const forwarded = mockFetch.mock.calls[0][0] as Request;
      expect(forwarded.url).toContain('fallback.api.com');
    });
  });

  // ── Fetch error ───────────────────────────────────────────────────────────

  describe('fetch errors', () => {
    it('returns 502 with error details when fetch throws', async () => {
      const ep = makeEndpoint({ mode: 'passthrough' });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe('Proxy error');
      expect(body.details).toBe('ECONNREFUSED');
    });
  });

  // ── Logging ───────────────────────────────────────────────────────────────

  describe('logging', () => {
    it('pushes a log entry to logBuffer after each request', async () => {
      const ep = makeEndpoint({ mode: 'mock', mock: { statusCode: 200, headers: {}, body: '{}' } });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      await handleProxyRequest(makeRequest());
      expect(mockLogBufferPush).toHaveBeenCalledOnce();
    });

    it('emits log entry to SSE clients after each request', async () => {
      const ep = makeEndpoint({ mode: 'mock', mock: { statusCode: 200, headers: {}, body: '{}' } });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      await handleProxyRequest(makeRequest());
      expect(mockSseEmit).toHaveBeenCalledOnce();
    });

    it('log entry contains correct method, path and statusCode', async () => {
      const ep = makeEndpoint({ mode: 'mock', mock: { statusCode: 404, headers: {}, body: 'not found' } });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      await handleProxyRequest(new Request('http://proxy.local/items', { method: 'DELETE' }));

      const logged = mockLogBufferPush.mock.calls[0][0];
      expect(logged.method).toBe('DELETE');
      expect(logged.path).toBe('/items');
      expect(logged.statusCode).toBe(404);
    });

    it('log entry mode is "mock" for mock endpoints', async () => {
      const ep = makeEndpoint({ mode: 'mock', mock: { statusCode: 200, headers: {}, body: '' } });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      await handleProxyRequest(makeRequest());
      expect(mockLogBufferPush.mock.calls[0][0].mode).toBe('mock');
    });
  });

  // ── Conditional rules ─────────────────────────────────────────────────────

  describe('conditional rules', () => {
    it('nth-request rule overrides mode to mock on matching count', async () => {
      const mockResponse = { statusCode: 503, headers: {}, body: '{"error":"overload"}' };
      const ep = makeEndpoint({
        mode: 'passthrough',
        conditionalRules: [{
          id: 'rule-1',
          name: 'every 3rd',
          type: 'nth-request',
          config: { n: 1 }, // fires on every request (count % 1 === 0)
          response: mockResponse,
          enabled: true,
        }],
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(503);
    });

    it('disabled rule does not fire', async () => {
      const ep = makeEndpoint({
        mode: 'passthrough',
        conditionalRules: [{
          id: 'rule-1',
          name: 'disabled',
          type: 'nth-request',
          config: { n: 1 },
          response: { statusCode: 503, headers: {}, body: '' },
          enabled: false,
        }],
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockResolvedValue(makeUpstreamResponse(200));

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(200);
    });

    it('header-match rule fires when header value matches pattern', async () => {
      const mockResponse = { statusCode: 401, headers: {}, body: '{"error":"unauthorized"}' };
      const ep = makeEndpoint({
        mode: 'passthrough',
        conditionalRules: [{
          id: 'rule-2',
          name: 'bad token',
          type: 'header-match',
          config: { header: 'x-test', pattern: 'fail' },
          response: mockResponse,
          enabled: true,
        }],
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });

      const req = new Request('http://proxy.local/users', {
        headers: { 'x-test': 'fail-me' },
      });
      const res = await handleProxyRequest(req);
      expect(res.status).toBe(401);
    });

    it('header-match rule does not fire when header is absent', async () => {
      const ep = makeEndpoint({
        mode: 'passthrough',
        conditionalRules: [{
          id: 'rule-2',
          name: 'missing header',
          type: 'header-match',
          config: { header: 'x-test', pattern: 'fail' },
          response: { statusCode: 401, headers: {}, body: '' },
          enabled: true,
        }],
      });
      mockMatchRequest.mockReturnValue({ endpoint: ep, upstreamUrl: 'https://api.example.com' });
      mockFetch.mockResolvedValue(makeUpstreamResponse(200));

      const res = await handleProxyRequest(makeRequest());
      expect(res.status).toBe(200);
    });
  });
});
