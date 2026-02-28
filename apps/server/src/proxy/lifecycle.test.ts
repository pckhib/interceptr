import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockServer = vi.hoisted(() => ({
  close: vi.fn().mockImplementation((cb: (err?: Error) => void) => cb()),
  on: vi.fn(),
}));

vi.mock('@hono/node-server', () => ({
  serve: vi.fn().mockImplementation((_opts: unknown, callback: () => void) => {
    callback();
    return mockServer;
  }),
}));

vi.mock('../config/store.js', () => ({
  store: { getConfig: vi.fn().mockReturnValue({ proxyPort: 4000 }) },
}));

vi.mock('../proxy.js', () => ({
  proxyApp: { fetch: vi.fn() },
}));

import { serve } from '@hono/node-server';
import { getProxyStatus, startProxy, stopProxy } from './lifecycle.js';

describe('lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure clean state — stop any proxy left running by a previous test.
    // mockServer.close impl is preserved by clearAllMocks, so this always resolves.
    await stopProxy();
  });

  describe('getProxyStatus', () => {
    it('returns not running initially', () => {
      expect(getProxyStatus()).toEqual({ running: false, port: null });
    });

    it('returns running and port after startProxy', async () => {
      await startProxy();
      expect(getProxyStatus()).toEqual({ running: true, port: 4000 });
    });
  });

  describe('startProxy', () => {
    it('resolves with the configured port', async () => {
      const result = await startProxy();
      expect(result).toEqual({ port: 4000 });
    });

    it('calls serve with the configured port', async () => {
      await startProxy();
      expect(vi.mocked(serve)).toHaveBeenCalledWith(
        expect.objectContaining({ port: 4000 }),
        expect.any(Function),
      );
    });

    it('does not call serve again when already running', async () => {
      await startProxy();
      await startProxy();
      expect(vi.mocked(serve)).toHaveBeenCalledTimes(1);
    });

    it('resolves with the current port when already running', async () => {
      await startProxy();
      const result = await startProxy();
      expect(result).toEqual({ port: 4000 });
    });

    it('rejects when the server emits an error', async () => {
      vi.mocked(serve).mockImplementationOnce((_opts: unknown, _cb: unknown) => ({
        ...mockServer,
        on: vi.fn().mockImplementation((event: string, handler: (err: Error) => void) => {
          if (event === 'error') handler(new Error('EADDRINUSE'));
        }),
      }));

      await expect(startProxy()).rejects.toThrow('EADDRINUSE');
      expect(getProxyStatus()).toEqual({ running: false, port: null });
    });
  });

  describe('stopProxy', () => {
    it('resolves immediately when not running', async () => {
      await expect(stopProxy()).resolves.toBeUndefined();
    });

    it('stops a running proxy and resets status', async () => {
      await startProxy();
      await stopProxy();

      expect(mockServer.close).toHaveBeenCalled();
      expect(getProxyStatus()).toEqual({ running: false, port: null });
    });

    it('rejects when close returns an error', async () => {
      await startProxy();
      mockServer.close.mockImplementationOnce((cb: (err?: Error) => void) =>
        cb(new Error('close error')),
      );

      await expect(stopProxy()).rejects.toThrow('close error');
    });
  });
});
