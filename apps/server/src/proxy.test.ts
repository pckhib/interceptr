import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandleProxyRequest = vi.hoisted(() =>
  vi.fn().mockResolvedValue(new Response('proxied', { status: 200 })),
);

vi.mock('./proxy/handler.js', () => ({ handleProxyRequest: mockHandleProxyRequest }));

import { proxyApp } from './proxy.js';

describe('proxyApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleProxyRequest.mockResolvedValue(new Response('proxied', { status: 200 }));
  });
  it('forwards all requests to handleProxyRequest', async () => {
    const res = await proxyApp.request('/api/data');
    expect(mockHandleProxyRequest).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('proxied');
  });

  it('passes the raw Request object to handleProxyRequest', async () => {
    await proxyApp.request('/some/path', { method: 'POST' });
    const [rawReq] = mockHandleProxyRequest.mock.calls[0];
    expect(rawReq).toBeInstanceOf(Request);
    expect(rawReq.method).toBe('POST');
  });

  it('returns whatever handleProxyRequest resolves with', async () => {
    mockHandleProxyRequest.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const res = await proxyApp.request('/anything');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('handles any HTTP method (DELETE)', async () => {
    await proxyApp.request('/resource/1', { method: 'DELETE' });
    const [rawReq] = mockHandleProxyRequest.mock.calls[0];
    expect(rawReq.method).toBe('DELETE');
  });
});
