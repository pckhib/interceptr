import { describe, it, expect, vi, beforeAll } from 'vitest';

const mockStoreLoad = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLogBufferLoad = vi.hoisted(() => vi.fn());
const mockRecompileRoutes = vi.hoisted(() => vi.fn());
const mockServe = vi.hoisted(() => vi.fn().mockImplementation((_opts: unknown, cb: () => void) => { cb(); return {}; }));
const mockStartProxy = vi.hoisted(() => vi.fn().mockResolvedValue({ port: 4000 }));
const mockStopProxy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@hono/node-server', () => ({ serve: mockServe }));
vi.mock('./app.js', () => ({ app: { fetch: vi.fn() } }));
vi.mock('./config/store.js', () => ({ store: { load: mockStoreLoad } }));
vi.mock('./logging/ring-buffer.js', () => ({ logBuffer: { load: mockLogBufferLoad } }));
vi.mock('./routes/helpers.js', () => ({ recompileRoutes: mockRecompileRoutes }));
vi.mock('./proxy/lifecycle.js', () => ({ startProxy: mockStartProxy, stopProxy: mockStopProxy }));
vi.mock('./version.js', () => ({ version: '1.2.3' }));

describe('cli startup', () => {
  let processOnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    await import('./cli.js');
  });

  it('loads store on startup', () => {
    expect(mockStoreLoad).toHaveBeenCalledTimes(1);
  });

  it('loads log buffer on startup', () => {
    expect(mockLogBufferLoad).toHaveBeenCalledTimes(1);
  });

  it('recompiles routes on startup', () => {
    expect(mockRecompileRoutes).toHaveBeenCalledTimes(1);
  });

  it('starts the management server on port 3001', () => {
    expect(mockServe).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3001 }),
      expect.any(Function),
    );
  });

  it('starts the proxy on startup', () => {
    expect(mockStartProxy).toHaveBeenCalledTimes(1);
  });

  it('registers SIGINT and SIGTERM handlers', () => {
    const signals = processOnSpy.mock.calls.map(([signal]) => signal);
    expect(signals).toContain('SIGINT');
    expect(signals).toContain('SIGTERM');
  });

  it('shutdown handler stops proxy and exits', async () => {
    const sigintCall = processOnSpy.mock.calls.find(([signal]) => signal === 'SIGINT');
    expect(sigintCall).toBeDefined();
    const shutdownFn = sigintCall![1] as () => Promise<void>;
    await shutdownFn();
    expect(mockStopProxy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});
