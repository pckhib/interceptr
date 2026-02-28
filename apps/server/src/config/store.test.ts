import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigStore } from './store.js';
import type { EndpointConfig, ProjectSpec, Preset } from '@interceptr/shared';

const mockReadFile = vi.hoisted(() => vi.fn().mockRejectedValue(new Error('ENOENT')));
const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMkdir = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRename = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAccess = vi.hoisted(() => vi.fn().mockRejectedValue(new Error('ENOENT')));
const mockUnlink = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// Suppress all disk I/O — store debounces writes, these mocks prevent any file activity
vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  rename: mockRename,
  access: mockAccess,
  unlink: mockUnlink,
}));

function makeSpec(overrides: Partial<ProjectSpec> = {}): ProjectSpec {
  return {
    id: 'spec-1',
    name: 'Test Spec',
    upstreamUrl: 'https://api.example.com',
    active: true,
    metadata: { title: 'Test', version: '1.0', endpointCount: 0, uploadedAt: '' },
    ...overrides,
  };
}

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

function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    name: 'Test Preset',
    endpoints: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ConfigStore', () => {
  let s: ConfigStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error('ENOENT'));
    mockUnlink.mockResolvedValue(undefined);
    s = new ConfigStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Config ─────────────────────────────────────────────────────────────────

  describe('getConfig / setConfig', () => {
    it('returns default proxyPort 4000', () => {
      expect(s.getConfig().proxyPort).toBe(4000);
    });

    it('returns null activeProjectId initially', () => {
      expect(s.getConfig().activeProjectId).toBeNull();
    });

    it('setConfig updates proxyPort', () => {
      s.setConfig({ proxyPort: 9090 });
      expect(s.getConfig().proxyPort).toBe(9090);
    });

    it('setConfig ignores unknown keys', () => {
      s.setConfig({} as any);
      expect(s.getConfig().proxyPort).toBe(4000);
    });
  });

  // ── Projects ───────────────────────────────────────────────────────────────

  describe('projects', () => {
    it('starts with no projects', () => {
      expect(s.listProjects()).toHaveLength(0);
    });

    it('createProject adds a project', () => {
      s.createProject('Alpha');
      expect(s.listProjects()).toHaveLength(1);
      expect(s.listProjects()[0].name).toBe('Alpha');
    });

    it('createProject auto-activates the first project', () => {
      s.createProject('Alpha');
      expect(s.getConfig().activeProjectId).not.toBeNull();
    });

    it('createProject does not auto-activate if one is already active', () => {
      const p1 = s.createProject('Alpha');
      s.createProject('Beta');
      expect(s.getConfig().activeProjectId).toBe(p1.id);
    });

    it('listProjects returns all created projects', () => {
      s.createProject('Alpha');
      s.createProject('Beta');
      expect(s.listProjects()).toHaveLength(2);
    });

    it('renameProject updates the name', () => {
      const p = s.createProject('OldName');
      s.renameProject(p.id, 'NewName');
      expect(s.listProjects()[0].name).toBe('NewName');
    });

    it('renameProject returns undefined for unknown id', () => {
      expect(s.renameProject('ghost', 'x')).toBeUndefined();
    });

    it('deleteProject returns false for active project', async () => {
      const p = s.createProject('Active');
      const result = await s.deleteProject(p.id);
      expect(result).toBe(false);
      expect(s.listProjects()).toHaveLength(1);
    });

    it('deleteProject removes a non-active project', async () => {
      s.createProject('Active');
      const p2 = s.createProject('Other');
      const result = await s.deleteProject(p2.id);
      expect(result).toBe(true);
      expect(s.listProjects()).toHaveLength(1);
    });

    it('switchProject returns false for unknown project', async () => {
      expect(await s.switchProject('ghost')).toBe(false);
    });

    it('switchProject returns true and updates activeProjectId', async () => {
      const p1 = s.createProject('P1');
      const p2 = s.createProject('P2');
      // p1 is auto-activated; switch to p2
      const result = await s.switchProject(p2.id);
      expect(result).toBe(true);
      expect(s.getConfig().activeProjectId).toBe(p2.id);
    });

    it('switchProject to same project is a no-op', async () => {
      const p = s.createProject('P1');
      await s.switchProject(p.id);
      expect(s.getConfig().activeProjectId).toBe(p.id);
    });

    it('getActiveProject returns null when no project is active', () => {
      expect(s.getActiveProject()).toBeNull();
    });

    it('getActiveProject returns the active project with specs', () => {
      s.createProject('Active');
      const active = s.getActiveProject();
      expect(active).not.toBeNull();
      expect(active!.name).toBe('Active');
      expect(Array.isArray(active!.specs)).toBe(true);
    });
  });

  // ── Specs ──────────────────────────────────────────────────────────────────

  describe('specs', () => {
    it('starts with no specs', () => {
      expect(s.getSpecs()).toHaveLength(0);
    });

    it('addSpec stores a spec', () => {
      const spec = makeSpec();
      s.addSpec(spec, []);
      expect(s.getSpecs()).toHaveLength(1);
      expect(s.getSpec('spec-1')?.id).toBe('spec-1');
    });

    it('addSpec enforces single-active: deactivates others when new spec is active', () => {
      const s1 = makeSpec({ id: 'spec-1', active: true });
      s.addSpec(s1, []);
      const s2 = makeSpec({ id: 'spec-2', active: true });
      s.addSpec(s2, []);
      expect(s.getSpec('spec-1')!.active).toBe(false);
      expect(s.getSpec('spec-2')!.active).toBe(true);
    });

    it('addSpec does not deactivate others when new spec is inactive', () => {
      const s1 = makeSpec({ id: 'spec-1', active: true });
      s.addSpec(s1, []);
      const s2 = makeSpec({ id: 'spec-2', active: false });
      s.addSpec(s2, []);
      expect(s.getSpec('spec-1')!.active).toBe(true);
    });

    it('updateSpec changes name and upstreamUrl', () => {
      s.addSpec(makeSpec(), []);
      s.updateSpec('spec-1', { name: 'Renamed', upstreamUrl: 'https://new.api.com' });
      const spec = s.getSpec('spec-1')!;
      expect(spec.name).toBe('Renamed');
      expect(spec.upstreamUrl).toBe('https://new.api.com');
    });

    it('updateSpec enforces single-active when activating a spec', () => {
      const s1 = makeSpec({ id: 'spec-1', active: true });
      const s2 = makeSpec({ id: 'spec-2', active: false });
      s.addSpec(s1, []);
      s.addSpec(s2, []);
      s.updateSpec('spec-2', { active: true });
      expect(s.getSpec('spec-1')!.active).toBe(false);
      expect(s.getSpec('spec-2')!.active).toBe(true);
    });

    it('updateSpec returns undefined for unknown specId', () => {
      expect(s.updateSpec('ghost', { name: 'x' })).toBeUndefined();
    });

    it('removeSpec deletes spec and its endpoints', () => {
      const ep = makeEndpoint({ id: 'ep-1', specId: 'spec-1' });
      s.addSpec(makeSpec(), [ep]);
      s.removeSpec('spec-1');
      expect(s.getSpecs()).toHaveLength(0);
      expect(s.getEndpoints()).toHaveLength(0);
    });

    it('removeSpec returns false for unknown specId', () => {
      expect(s.removeSpec('ghost')).toBe(false);
    });

    it('getSpecUpstreamUrl returns the upstream URL', () => {
      s.addSpec(makeSpec({ upstreamUrl: 'https://target.com' }), []);
      expect(s.getSpecUpstreamUrl('spec-1')).toBe('https://target.com');
    });
  });

  // ── Endpoints ─────────────────────────────────────────────────────────────

  describe('endpoints', () => {
    beforeEach(() => {
      s.addSpec(makeSpec(), [
        makeEndpoint({ id: 'ep-1' }),
        makeEndpoint({ id: 'ep-2', path: '/items' }),
      ]);
    });

    it('getEndpoints returns all endpoints', () => {
      expect(s.getEndpoints()).toHaveLength(2);
    });

    it('getActiveEndpoints returns only endpoints from active specs', () => {
      expect(s.getActiveEndpoints()).toHaveLength(2);
    });

    it('getActiveEndpoints excludes endpoints from inactive specs', () => {
      s.updateSpec('spec-1', { active: false });
      expect(s.getActiveEndpoints()).toHaveLength(0);
    });

    it('getEndpoint returns a copy of the endpoint', () => {
      const ep = s.getEndpoint('ep-1');
      expect(ep).toBeDefined();
      expect(ep!.id).toBe('ep-1');
    });

    it('setEndpoint merges partial update', () => {
      s.setEndpoint('ep-1', { mode: 'mock', mock: { statusCode: 200, headers: {}, body: '{}' } });
      expect(s.getEndpoint('ep-1')!.mode).toBe('mock');
    });

    it('setEndpoint returns undefined for unknown id', () => {
      expect(s.setEndpoint('ghost', { mode: 'mock' })).toBeUndefined();
    });

    it('bulkUpdateEndpoints updates multiple endpoints', () => {
      s.bulkUpdateEndpoints({
        'ep-1': { mode: 'delay', delay: { ms: 500 } },
        'ep-2': { mode: 'mock', mock: { statusCode: 503, headers: {}, body: '' } },
      });
      expect(s.getEndpoint('ep-1')!.mode).toBe('delay');
      expect(s.getEndpoint('ep-2')!.mode).toBe('mock');
    });

    it('bulkUpdateEndpoints skips unknown ids', () => {
      const updated = s.bulkUpdateEndpoints({ ghost: { mode: 'mock' } });
      expect(updated).toHaveLength(0);
    });
  });

  // ── reimportSpec ──────────────────────────────────────────────────────────

  describe('reimportSpec', () => {
    it('preserves mode, delay, mock from existing endpoint on path match', () => {
      const ep = makeEndpoint({
        id: 'spec-1:GET:/users',
        specId: 'spec-1',
        mode: 'delay',
        delay: { ms: 2000 },
      });
      s.addSpec(makeSpec(), [ep]);

      const newEndpoint = makeEndpoint({
        id: 'spec-1:GET:/users',
        specId: 'spec-1',
        mode: 'passthrough',
      });
      const newMeta = makeSpec().metadata;
      s.reimportSpec('spec-1', newMeta, [newEndpoint]);

      const updated = s.getEndpoint('spec-1:GET:/users')!;
      expect(updated.mode).toBe('delay');
      expect(updated.delay?.ms).toBe(2000);
    });

    it('adds new endpoints not present in the previous import', () => {
      s.addSpec(makeSpec(), [makeEndpoint({ id: 'spec-1:GET:/users' })]);

      s.reimportSpec('spec-1', makeSpec().metadata, [
        makeEndpoint({ id: 'spec-1:GET:/users' }),
        makeEndpoint({ id: 'spec-1:POST:/users', method: 'POST', path: '/users' }),
      ]);

      expect(s.getEndpoints()).toHaveLength(2);
    });

    it('returns false for unknown specId', () => {
      expect(s.reimportSpec('ghost', makeSpec().metadata, [])).toBe(false);
    });
  });

  // ── Presets ───────────────────────────────────────────────────────────────

  describe('presets', () => {
    it('starts with no presets', () => {
      expect(s.getPresets()).toHaveLength(0);
    });

    it('setPreset stores a preset', () => {
      s.setPreset(makePreset({ name: 'Slow' }));
      expect(s.getPresets()).toHaveLength(1);
    });

    it('getPreset returns the preset by name', () => {
      s.setPreset(makePreset({ name: 'Slow' }));
      expect(s.getPreset('Slow')?.name).toBe('Slow');
    });

    it('getPreset returns undefined for unknown name', () => {
      expect(s.getPreset('ghost')).toBeUndefined();
    });

    it('deletePreset removes the preset', () => {
      s.setPreset(makePreset({ name: 'Slow' }));
      expect(s.deletePreset('Slow')).toBe(true);
      expect(s.getPresets()).toHaveLength(0);
    });

    it('deletePreset returns false for unknown name', () => {
      expect(s.deletePreset('ghost')).toBe(false);
    });

    it('applyPreset bulk-updates matching endpoints', () => {
      s.addSpec(makeSpec(), [makeEndpoint({ id: 'ep-1' })]);
      s.setPreset(makePreset({
        name: 'Errors',
        endpoints: { 'ep-1': { mode: 'mock', mock: { statusCode: 500, headers: {}, body: '' } } },
      }));
      const updated = s.applyPreset('Errors');
      expect(updated).toHaveLength(1);
      expect(s.getEndpoint('ep-1')!.mode).toBe('mock');
    });

    it('applyPreset returns empty array for unknown preset', () => {
      expect(s.applyPreset('ghost')).toHaveLength(0);
    });
  });

  // ── Export / Import ───────────────────────────────────────────────────────

  describe('exportData / importData', () => {
    it('exportData returns version 2', () => {
      expect(s.exportData().version).toBe(2);
    });

    it('exportData includes current config', () => {
      s.setConfig({ proxyPort: 7777 });
      expect(s.exportData().config.proxyPort).toBe(7777);
    });

    it('exportData includes specs and endpoints', () => {
      s.addSpec(makeSpec(), [makeEndpoint()]);
      const data = s.exportData();
      expect(data.specs).toHaveLength(1);
      expect(data.endpoints).toHaveLength(1);
    });

    it('importData replaces specs, endpoints, and presets', async () => {
      s.addSpec(makeSpec({ id: 'old-spec' }), [makeEndpoint({ id: 'old-ep', specId: 'old-spec' })]);

      await s.importData({
        specs: [makeSpec({ id: 'new-spec' })],
        endpoints: [makeEndpoint({ id: 'new-ep', specId: 'new-spec' })],
        presets: [makePreset({ name: 'imported' })],
      });

      expect(s.getSpec('old-spec')).toBeUndefined();
      expect(s.getSpec('new-spec')).toBeDefined();
      expect(s.getEndpoint('old-ep')).toBeUndefined();
      expect(s.getEndpoint('new-ep')).toBeDefined();
      expect(s.getPreset('imported')).toBeDefined();
    });

    it('importData updates proxyPort from config', async () => {
      await s.importData({ config: { proxyPort: 8888, activeProjectId: null } });
      expect(s.getConfig().proxyPort).toBe(8888);
    });
  });

  // ── load() ────────────────────────────────────────────────────────────────

  describe('load()', () => {
    it('reads global config from file and applies it', async () => {
      const globalData = {
        proxyPort: 9090,
        activeProjectId: null,
        projects: [{ id: 'p1', name: 'Loaded', createdAt: '', updatedAt: '' }],
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(globalData));

      await s.load();

      expect(s.getConfig().proxyPort).toBe(9090);
      expect(s.listProjects()).toHaveLength(1);
      expect(s.listProjects()[0].name).toBe('Loaded');
    });

    it('uses default proxyPort when field is absent in file', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ activeProjectId: null, projects: [] }));

      await s.load();

      expect(s.getConfig().proxyPort).toBe(4000);
    });

    it('loads project data when activeProjectId is set', async () => {
      const globalData = {
        proxyPort: 4000,
        activeProjectId: 'p1',
        projects: [{ id: 'p1', name: 'P1', createdAt: '', updatedAt: '' }],
      };
      const projectData = {
        specs: [makeSpec({ id: 'spec-from-file' })],
        endpoints: [makeEndpoint({ id: 'ep-from-file', specId: 'spec-from-file' })],
        presets: [makePreset({ name: 'preset-from-file' })],
      };
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(globalData))
        .mockResolvedValueOnce(JSON.stringify(projectData));

      await s.load();

      expect(s.getSpec('spec-from-file')).toBeDefined();
      expect(s.getEndpoint('ep-from-file')).toBeDefined();
      expect(s.getPreset('preset-from-file')).toBeDefined();
    });

    it('handles a missing global config file gracefully', async () => {
      // readFile already rejects by default — no explicit setup needed
      await expect(s.load()).resolves.toBeUndefined();
      expect(s.getConfig().proxyPort).toBe(4000);
    });
  });

  // ── migrate() ─────────────────────────────────────────────────────────────

  describe('load() — legacy migration', () => {
    it('migrates a legacy config file', async () => {
      mockAccess.mockResolvedValueOnce(undefined); // legacy file exists
      const legacy = {
        config: { proxyPort: 5000, upstreamUrl: 'http://old.api.com' },
        endpoints: [],
        presets: [],
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(legacy));

      await s.load();

      expect(s.getConfig().proxyPort).toBe(5000);
      expect(s.listProjects()).toHaveLength(1);
      expect(mockRename).toHaveBeenCalled();
    });

    it('migrates a legacy config that includes a spec', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      const legacy = {
        spec: { openapi: '3.0.0' },
        config: { upstreamUrl: 'http://api.com' },
        endpoints: [makeEndpoint({ id: 'legacy-ep' })],
        presets: [],
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(legacy));

      await s.load();

      expect(s.getSpecs()).toHaveLength(1);
    });
  });

  // ── getActiveProjectId ────────────────────────────────────────────────────

  describe('getActiveProjectId()', () => {
    it('returns null when no project is active', () => {
      expect(s.getActiveProjectId()).toBeNull();
    });

    it('returns the active project id after a project is created', () => {
      const p = s.createProject('Test');
      expect(s.getActiveProjectId()).toBe(p.id);
    });
  });

  // ── setEndpoints ──────────────────────────────────────────────────────────

  describe('setEndpoints()', () => {
    it('replaces all endpoints for a given specId', () => {
      s.addSpec(makeSpec(), [
        makeEndpoint({ id: 'ep-old-1' }),
        makeEndpoint({ id: 'ep-old-2', path: '/other' }),
      ]);

      s.setEndpoints([makeEndpoint({ id: 'ep-new', path: '/new' })]);

      expect(s.getEndpoint('ep-old-1')).toBeUndefined();
      expect(s.getEndpoint('ep-old-2')).toBeUndefined();
      expect(s.getEndpoint('ep-new')).toBeDefined();
    });

    it('accepts an empty array without throwing', () => {
      s.addSpec(makeSpec(), [makeEndpoint()]);
      expect(() => s.setEndpoints([])).not.toThrow();
      // existing endpoints are untouched when array is empty
      expect(s.getEndpoints()).toHaveLength(1);
    });

    it('adds endpoints when the specId has no existing entries', () => {
      s.setEndpoints([makeEndpoint({ id: 'brand-new' })]);
      expect(s.getEndpoint('brand-new')).toBeDefined();
    });
  });

  // ── persistence timers ────────────────────────────────────────────────────

  describe('persistence timers', () => {
    it('persistGlobal logs an error when the write fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWriteFile.mockRejectedValueOnce(new Error('disk full'));

      s.setConfig({ proxyPort: 9090 }); // triggers scheduleGlobalSave
      await vi.runAllTimersAsync();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist global config:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('persistProject returns early when no active project is set', async () => {
      // addSpec schedules a project save but there is no activeProjectId
      s.addSpec(makeSpec(), []);
      await vi.runAllTimersAsync();

      // writeFile should not be called for project data
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
