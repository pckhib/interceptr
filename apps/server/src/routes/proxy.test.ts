import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetProxyStatus = vi.hoisted(() =>
  vi.fn().mockReturnValue({ running: false, port: null }),
);
const mockStartProxy = vi.hoisted(() => vi.fn().mockResolvedValue({ port: 4000 }));
const mockStopProxy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../proxy/lifecycle.js', () => ({
  getProxyStatus: mockGetProxyStatus,
  startProxy: mockStartProxy,
  stopProxy: mockStopProxy,
}));

import proxy from './proxy.js';

async function json(res: Response) {
  return res.json();
}

describe('Proxy routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /status', () => {
    it('returns the current proxy status', async () => {
      mockGetProxyStatus.mockReturnValueOnce({ running: true, port: 4000 });
      const res = await proxy.request('/status');
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.data).toEqual({ running: true, port: 4000 });
    });
  });

  describe('POST /start', () => {
    it('starts the proxy and returns merged status', async () => {
      mockGetProxyStatus.mockReturnValueOnce({ running: true, port: 4000 });
      const res = await proxy.request('/start', { method: 'POST' });
      expect(res.status).toBe(200);
      expect(mockStartProxy).toHaveBeenCalled();
      const body = await json(res);
      expect(body.data.port).toBe(4000);
      expect(body.data.running).toBe(true);
    });

    it('returns 500 when startProxy throws', async () => {
      mockStartProxy.mockRejectedValueOnce(new Error('EADDRINUSE'));
      const res = await proxy.request('/start', { method: 'POST' });
      expect(res.status).toBe(500);
      const body = await json(res);
      expect(body.error).toBe('EADDRINUSE');
    });

    it('returns 500 with generic message when error is not an Error instance', async () => {
      mockStartProxy.mockRejectedValueOnce('oops');
      const res = await proxy.request('/start', { method: 'POST' });
      expect(res.status).toBe(500);
      const body = await json(res);
      expect(body.error).toBe('Failed to start proxy');
    });
  });

  describe('POST /stop', () => {
    it('stops the proxy and returns updated status', async () => {
      mockGetProxyStatus.mockReturnValueOnce({ running: false, port: null });
      const res = await proxy.request('/stop', { method: 'POST' });
      expect(res.status).toBe(200);
      expect(mockStopProxy).toHaveBeenCalled();
      const body = await json(res);
      expect(body.data.running).toBe(false);
    });

    it('returns 500 when stopProxy throws', async () => {
      mockStopProxy.mockRejectedValueOnce(new Error('stop error'));
      const res = await proxy.request('/stop', { method: 'POST' });
      expect(res.status).toBe(500);
      const body = await json(res);
      expect(body.error).toBe('stop error');
    });

    it('returns 500 with generic message when error is not an Error instance', async () => {
      mockStopProxy.mockRejectedValueOnce('oops');
      const res = await proxy.request('/stop', { method: 'POST' });
      expect(res.status).toBe(500);
      const body = await json(res);
      expect(body.error).toBe('Failed to stop proxy');
    });
  });
});
