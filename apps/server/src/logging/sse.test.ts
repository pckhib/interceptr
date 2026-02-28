import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sseEmitter } from './sse.js';
import type { ProxyLogEntry } from '@interceptr/shared';

function makeEntry(overrides: Partial<ProxyLogEntry> = {}): ProxyLogEntry {
  return {
    id: 'log-1',
    timestamp: '2025-01-01T00:00:00.000Z',
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    latencyMs: 25,
    mode: 'passthrough',
    ...overrides,
  };
}

describe('SSEEmitter (singleton)', () => {
  const cleanups: Array<() => void> = [];

  // Register clients via helper so we can always clean up after each test
  function addClient(fn: (data: string) => void): () => void {
    const cleanup = sseEmitter.addClient(fn);
    cleanups.push(cleanup);
    return cleanup;
  }

  beforeEach(() => {
    // Remove any leftover clients from prior tests
    while (cleanups.length) cleanups.pop()!();
  });

  it('starts with zero clients after cleanup', () => {
    expect(sseEmitter.clientCount).toBe(0);
  });

  it('addClient increments clientCount', () => {
    addClient(vi.fn());
    expect(sseEmitter.clientCount).toBe(1);
  });

  it('addClient with multiple clients increments count for each', () => {
    addClient(vi.fn());
    addClient(vi.fn());
    addClient(vi.fn());
    expect(sseEmitter.clientCount).toBe(3);
  });

  it('cleanup function removes the client', () => {
    const cleanup = addClient(vi.fn());
    cleanup();
    expect(sseEmitter.clientCount).toBe(0);
  });

  it('cleanup only removes the registered client, not others', () => {
    const cleanup = addClient(vi.fn());
    addClient(vi.fn());
    cleanup();
    expect(sseEmitter.clientCount).toBe(1);
  });

  it('emit calls the client with JSON-stringified entry', () => {
    const client = vi.fn();
    addClient(client);
    const entry = makeEntry({ id: 'test-id' });
    sseEmitter.emit(entry);
    expect(client).toHaveBeenCalledOnce();
    expect(client).toHaveBeenCalledWith(JSON.stringify(entry));
  });

  it('emit calls all registered clients', () => {
    const c1 = vi.fn();
    const c2 = vi.fn();
    addClient(c1);
    addClient(c2);
    sseEmitter.emit(makeEntry());
    expect(c1).toHaveBeenCalledOnce();
    expect(c2).toHaveBeenCalledOnce();
  });

  it('emit auto-removes a client that throws', () => {
    const bad = vi.fn().mockImplementation(() => { throw new Error('closed'); });
    const good = vi.fn();
    addClient(bad);
    addClient(good);
    sseEmitter.emit(makeEntry());
    expect(sseEmitter.clientCount).toBe(1);
    // good client still receives future emissions
    sseEmitter.emit(makeEntry());
    expect(good).toHaveBeenCalledTimes(2);
  });

  it('emit with no clients does not throw', () => {
    expect(() => sseEmitter.emit(makeEntry())).not.toThrow();
  });

  it('emit does not call removed client', () => {
    const client = vi.fn();
    const cleanup = addClient(client);
    cleanup();
    sseEmitter.emit(makeEntry());
    expect(client).not.toHaveBeenCalled();
  });
});
