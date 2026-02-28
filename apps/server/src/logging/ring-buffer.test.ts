import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RingBuffer } from './ring-buffer.js';
import type { ProxyLogEntry } from '@interceptr/shared';

const mockExistsSync = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());

// Suppress disk I/O in all tests
vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
}));

function makeEntry(overrides: Partial<ProxyLogEntry> = {}): ProxyLogEntry {
  return {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    method: 'GET',
    path: '/test',
    statusCode: 200,
    latencyMs: 10,
    mode: 'passthrough',
    ...overrides,
  };
}

describe('RingBuffer', () => {
  let buf: RingBuffer;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    buf = new RingBuffer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty', () => {
    expect(buf.size).toBe(0);
    expect(buf.getAll()).toEqual([]);
  });

  it('push adds an entry', () => {
    const entry = makeEntry({ id: 'a' });
    buf.push(entry);
    expect(buf.size).toBe(1);
  });

  it('getAll returns entries in reverse order (newest first)', () => {
    const a = makeEntry({ id: 'a' });
    const b = makeEntry({ id: 'b' });
    buf.push(a);
    buf.push(b);
    const all = buf.getAll();
    expect(all[0].id).toBe('b');
    expect(all[1].id).toBe('a');
  });

  it('getRecent returns only the requested count', () => {
    for (let i = 0; i < 5; i++) buf.push(makeEntry({ id: `e${i}` }));
    const recent = buf.getRecent(3);
    expect(recent).toHaveLength(3);
  });

  it('getRecent returns newest entries first', () => {
    for (let i = 0; i < 3; i++) buf.push(makeEntry({ id: `e${i}` }));
    const recent = buf.getRecent(2);
    expect(recent[0].id).toBe('e2');
    expect(recent[1].id).toBe('e1');
  });

  it('clear empties the buffer', () => {
    buf.push(makeEntry());
    buf.push(makeEntry());
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.getAll()).toEqual([]);
  });

  it('enforces max size of 500 by shifting oldest entry', () => {
    for (let i = 0; i < 501; i++) buf.push(makeEntry({ id: `e${i}` }));
    expect(buf.size).toBe(500);
    // Oldest (e0) should be gone; newest (e500) should be present
    const all = buf.getAll();
    expect(all[0].id).toBe('e500');
    expect(all.find((e) => e.id === 'e0')).toBeUndefined();
  });

  it('size returns 500 after pushing exactly 500 entries', () => {
    for (let i = 0; i < 500; i++) buf.push(makeEntry());
    expect(buf.size).toBe(500);
  });

  it('getAll does not mutate the internal array', () => {
    buf.push(makeEntry({ id: 'x' }));
    const all = buf.getAll();
    all.pop();
    expect(buf.size).toBe(1);
  });

  it('schedules only one save timer for multiple rapid pushes', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    buf.push(makeEntry());
    buf.push(makeEntry());
    buf.push(makeEntry());
    // scheduleSave guards with `if (this.saveTimer) return`
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
  });

  it('clear after push still leaves buffer empty', () => {
    for (let i = 0; i < 10; i++) buf.push(makeEntry());
    buf.clear();
    expect(buf.size).toBe(0);
  });

  describe('load()', () => {
    it('does nothing when log file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      buf.load();
      expect(buf.size).toBe(0);
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('populates entries from a valid JSON array on disk', () => {
      const entries = [makeEntry({ id: 'x' }), makeEntry({ id: 'y' })];
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(entries));

      buf.load();

      expect(buf.size).toBe(2);
      // getAll returns newest-first; the last entry in the array is newest
      expect(buf.getAll()[0].id).toBe('y');
    });

    it('trims entries to the last MAX_SIZE (500) when file has more', () => {
      const entries = Array.from({ length: 600 }, (_, i) => makeEntry({ id: `e${i}` }));
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(entries));

      buf.load();

      expect(buf.size).toBe(500);
      // slice(-500) keeps the last 500, so e100 is first stored, e599 is last
      expect(buf.getAll()[0].id).toBe('e599');
    });

    it('ignores a non-array JSON value', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ not: 'an array' }));

      buf.load();

      expect(buf.size).toBe(0);
    });

    it('ignores corrupt JSON without throwing', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('not valid json {{');

      expect(() => buf.load()).not.toThrow();
      expect(buf.size).toBe(0);
    });
  });

  describe('saveToDisk() (via timer)', () => {
    it('writes serialised entries to disk after the debounce delay', () => {
      const entry = makeEntry({ id: 'save-me' });
      mockExistsSync.mockReturnValue(true); // dir already exists

      buf.push(entry);
      vi.runAllTimers();

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe('save-me');
    });

    it('creates the data directory when it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      buf.push(makeEntry());
      vi.runAllTimers();

      expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('skips mkdirSync when directory already exists', () => {
      mockExistsSync.mockReturnValue(true);

      buf.push(makeEntry());
      vi.runAllTimers();

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('saves an empty array after clear()', () => {
      buf.push(makeEntry());
      buf.clear();
      vi.runAllTimers();

      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(written).toEqual([]);
    });

    it('ignores writeFileSync errors without throwing', () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementationOnce(() => { throw new Error('disk full'); });

      buf.push(makeEntry());
      expect(() => vi.runAllTimers()).not.toThrow();
    });

    it('reschedules a new save after the previous timer fires', () => {
      buf.push(makeEntry({ id: 'first' }));
      vi.runAllTimers(); // first save fires, timer is cleared

      buf.push(makeEntry({ id: 'second' }));
      vi.runAllTimers(); // second save fires

      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
