import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import type {
  EndpointConfig,
  GlobalConfig,
  Preset,
  Project,
  ProjectSpec,
  SavedResponse,
} from '@interceptr/shared';

const GLOBAL_PATH = 'data/global.json';
const PROJECTS_DIR = 'data/projects';
const LEGACY_PATH = 'data/config.json';
const DEBOUNCE_MS = 1000;

interface GlobalData {
  proxyPort: number;
  activeProjectId: string | null;
  projects: Project[];
}

interface ProjectData {
  specs: ProjectSpec[];
  endpoints: EndpointConfig[];
  presets: Preset[];
  savedResponses: SavedResponse[];
}

const DEFAULT_CONFIG: GlobalConfig = {
  proxyPort: 4000,
  activeProjectId: null,
};

export class ConfigStore {
  private proxyPort = DEFAULT_CONFIG.proxyPort;
  private projects = new Map<string, Project>();
  private activeProjectId: string | null = null;

  // Active project data
  private specs = new Map<string, ProjectSpec>();
  private endpoints = new Map<string, EndpointConfig>();
  private presets = new Map<string, Preset>();
  private savedResponses = new Map<string, SavedResponse>();

  private globalSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private projectSaveTimer: ReturnType<typeof setTimeout> | null = null;

  async load(): Promise<void> {
    // Check for legacy config and migrate
    if (await this.fileExists(LEGACY_PATH)) {
      await this.migrate();
      return;
    }

    try {
      const raw = await readFile(GLOBAL_PATH, 'utf-8');
      const data: GlobalData = JSON.parse(raw);
      this.proxyPort = data.proxyPort ?? DEFAULT_CONFIG.proxyPort;
      this.activeProjectId = data.activeProjectId;
      this.projects.clear();
      for (const p of data.projects ?? []) {
        this.projects.set(p.id, p);
      }

      if (this.activeProjectId) {
        await this.loadProjectData(this.activeProjectId);
      }

      console.log(
        `Loaded config: ${this.projects.size} projects, ${this.endpoints.size} endpoints, ${this.presets.size} presets`,
      );
    } catch {
      console.log('No existing config found, starting fresh');
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async migrate(): Promise<void> {
    console.log('Migrating legacy config...');
    try {
      const raw = await readFile(LEGACY_PATH, 'utf-8');
      const legacy = JSON.parse(raw);

      const projectId = nanoid();
      const specId = nanoid();
      const now = new Date().toISOString();

      const project: Project = {
        id: projectId,
        name: 'Default',
        createdAt: now,
        updatedAt: now,
      };

      const specs: ProjectSpec[] = [];
      if (legacy.spec) {
        specs.push({
          id: specId,
          name: 'default',
          upstreamUrl: legacy.config?.upstreamUrl ?? 'http://localhost:8080',
          active: true,
          metadata: legacy.spec,
        });
      }

      const endpoints: EndpointConfig[] = (legacy.endpoints ?? []).map(
        (ep: Record<string, unknown>) => ({
          ...ep,
          specId,
        }),
      );

      const presets: Preset[] = legacy.presets ?? [];

      const globalData: GlobalData = {
        proxyPort: legacy.config?.proxyPort ?? 4000,
        activeProjectId: projectId,
        projects: [project],
      };

      await mkdir(PROJECTS_DIR, { recursive: true });
      await writeFile(GLOBAL_PATH, JSON.stringify(globalData, null, 2), 'utf-8');
      await writeFile(
        join(PROJECTS_DIR, `${projectId}.json`),
        JSON.stringify({ specs, endpoints, presets }, null, 2),
        'utf-8',
      );

      await rename(LEGACY_PATH, `${LEGACY_PATH}.bak`);

      // Load into memory
      this.proxyPort = globalData.proxyPort;
      this.activeProjectId = projectId;
      this.projects.set(projectId, project);
      for (const s of specs) this.specs.set(s.id, s);
      for (const ep of endpoints) this.endpoints.set(ep.id, ep);
      for (const p of presets) this.presets.set(p.name, p);

      console.log('Migration complete');
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }

  private async loadProjectData(projectId: string): Promise<void> {
    this.specs.clear();
    this.endpoints.clear();
    this.presets.clear();
    this.savedResponses.clear();

    try {
      const raw = await readFile(join(PROJECTS_DIR, `${projectId}.json`), 'utf-8');
      const data: ProjectData = JSON.parse(raw);
      for (const s of data.specs ?? []) this.specs.set(s.id, s);
      for (const ep of data.endpoints ?? []) this.endpoints.set(ep.id, ep);
      for (const p of data.presets ?? []) this.presets.set(p.name, p);
      for (const r of data.savedResponses ?? []) this.savedResponses.set(r.id, r);
    } catch {
      // Project data file doesn't exist yet
    }
  }

  private scheduleGlobalSave(): void {
    if (this.globalSaveTimer) clearTimeout(this.globalSaveTimer);
    this.globalSaveTimer = setTimeout(() => this.persistGlobal(), DEBOUNCE_MS);
  }

  private scheduleProjectSave(): void {
    if (this.projectSaveTimer) clearTimeout(this.projectSaveTimer);
    this.projectSaveTimer = setTimeout(() => this.persistProject(), DEBOUNCE_MS);
  }

  private async persistGlobal(): Promise<void> {
    const data: GlobalData = {
      proxyPort: this.proxyPort,
      activeProjectId: this.activeProjectId,
      projects: Array.from(this.projects.values()),
    };
    try {
      await mkdir('data', { recursive: true });
      await writeFile(GLOBAL_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist global config:', err);
    }
  }

  private async persistProject(): Promise<void> {
    if (!this.activeProjectId) return;
    const data: ProjectData = {
      specs: Array.from(this.specs.values()),
      endpoints: Array.from(this.endpoints.values()),
      presets: Array.from(this.presets.values()),
      savedResponses: Array.from(this.savedResponses.values()),
    };
    try {
      await mkdir(PROJECTS_DIR, { recursive: true });
      await writeFile(
        join(PROJECTS_DIR, `${this.activeProjectId}.json`),
        JSON.stringify(data, null, 2),
        'utf-8',
      );
    } catch (err) {
      console.error('Failed to persist project data:', err);
    }
  }

  // ── Global Config ──

  getConfig(): GlobalConfig {
    return { proxyPort: this.proxyPort, activeProjectId: this.activeProjectId };
  }

  setConfig(config: Partial<GlobalConfig>): GlobalConfig {
    if (config.proxyPort !== undefined) this.proxyPort = config.proxyPort;
    this.scheduleGlobalSave();
    return this.getConfig();
  }

  // ── Projects ──

  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  getActiveProjectId(): string | null {
    return this.activeProjectId;
  }

  createProject(name: string): Project {
    const now = new Date().toISOString();
    const project: Project = { id: nanoid(), name, createdAt: now, updatedAt: now };
    this.projects.set(project.id, project);

    if (!this.activeProjectId) {
      this.activeProjectId = project.id;
    }

    this.scheduleGlobalSave();
    return project;
  }

  renameProject(id: string, name: string): Project | undefined {
    const project = this.projects.get(id);
    if (!project) return undefined;
    project.name = name;
    project.updatedAt = new Date().toISOString();
    this.scheduleGlobalSave();
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (id === this.activeProjectId) return false;
    const deleted = this.projects.delete(id);
    if (deleted) {
      this.scheduleGlobalSave();
      try {
        const { unlink } = await import('node:fs/promises');
        await unlink(join(PROJECTS_DIR, `${id}.json`));
      } catch {
        // File may not exist
      }
    }
    return deleted;
  }

  async switchProject(projectId: string): Promise<boolean> {
    if (!this.projects.has(projectId)) return false;
    if (this.activeProjectId === projectId) return true;

    // Persist current project before switching
    await this.persistProject();

    this.activeProjectId = projectId;
    await this.loadProjectData(projectId);
    this.scheduleGlobalSave();
    return true;
  }

  getActiveProject(): (Project & { specs: ProjectSpec[] }) | null {
    if (!this.activeProjectId) return null;
    const project = this.projects.get(this.activeProjectId);
    if (!project) return null;
    return { ...project, specs: Array.from(this.specs.values()) };
  }

  // ── Specs ──

  getSpecs(): ProjectSpec[] {
    return Array.from(this.specs.values());
  }

  getSpec(specId: string): ProjectSpec | undefined {
    return this.specs.get(specId);
  }

  addSpec(spec: ProjectSpec, endpoints: EndpointConfig[]): void {
    // Only one spec can be active at a time
    if (spec.active) {
      for (const s of this.specs.values()) {
        s.active = false;
      }
    }
    this.specs.set(spec.id, spec);
    for (const ep of endpoints) {
      this.endpoints.set(ep.id, ep);
    }
    this.scheduleProjectSave();
  }

  updateSpec(
    specId: string,
    updates: Partial<Pick<ProjectSpec, 'name' | 'upstreamUrl' | 'active' | 'globalHeaders' | 'applyGlobalHeadersToAll'>>,
  ): ProjectSpec | undefined {
    const spec = this.specs.get(specId);
    if (!spec) return undefined;
    if (updates.name !== undefined) spec.name = updates.name;
    if (updates.upstreamUrl !== undefined) spec.upstreamUrl = updates.upstreamUrl;
    if (updates.globalHeaders !== undefined) spec.globalHeaders = updates.globalHeaders;
    if (updates.applyGlobalHeadersToAll !== undefined) spec.applyGlobalHeadersToAll = updates.applyGlobalHeadersToAll;
    if (updates.active !== undefined) {
      spec.active = updates.active;
      // Only one spec can be active at a time
      if (updates.active) {
        for (const [id, s] of this.specs) {
          if (id !== specId) s.active = false;
        }
      }
    }
    this.scheduleProjectSave();
    return spec;
  }

  reimportSpec(specId: string, metadata: ProjectSpec['metadata'], newEndpoints: EndpointConfig[]): boolean {
    const spec = this.specs.get(specId);
    if (!spec) return false;

    // Build a map of existing endpoint configs by their method:path key
    const existingConfigs = new Map<string, EndpointConfig>();
    for (const [, ep] of this.endpoints) {
      if (ep.specId === specId) {
        // Strip the specId prefix to get the method:path key
        const key = ep.id.startsWith(`${specId}:`) ? ep.id.slice(specId.length + 1) : ep.id;
        existingConfigs.set(key, ep);
      }
    }

    // Remove old endpoints for this spec
    for (const [id, ep] of this.endpoints) {
      if (ep.specId === specId) {
        this.endpoints.delete(id);
      }
    }

    // Add new endpoints, preserving user config (mode, delay, mock, conditionalRules) where path matches
    for (const ep of newEndpoints) {
      const key = ep.id.startsWith(`${specId}:`) ? ep.id.slice(specId.length + 1) : ep.id;
      const existing = existingConfigs.get(key);
      if (existing) {
        this.endpoints.set(ep.id, {
          ...ep,
          mode: existing.mode,
          delay: existing.delay,
          mock: existing.mock,
          conditionalRules: existing.conditionalRules,
        });
      } else {
        this.endpoints.set(ep.id, ep);
      }
    }

    // Update metadata
    spec.metadata = metadata;
    this.scheduleProjectSave();
    return true;
  }

  removeSpec(specId: string): boolean {
    const deleted = this.specs.delete(specId);
    if (deleted) {
      for (const [id, ep] of this.endpoints) {
        if (ep.specId === specId) {
          this.endpoints.delete(id);
        }
      }
      this.scheduleProjectSave();
    }
    return deleted;
  }

  getSpecUpstreamUrl(specId: string): string | undefined {
    return this.specs.get(specId)?.upstreamUrl;
  }

  // ── Endpoints ──

  getEndpoints(): EndpointConfig[] {
    return Array.from(this.endpoints.values());
  }

  getActiveEndpoints(): EndpointConfig[] {
    const activeSpecIds = new Set(
      Array.from(this.specs.values())
        .filter((s) => s.active)
        .map((s) => s.id),
    );
    return Array.from(this.endpoints.values()).filter((ep) => activeSpecIds.has(ep.specId));
  }

  getEndpoint(id: string): EndpointConfig | undefined {
    const ep = this.endpoints.get(id);
    return ep ? { ...ep } : undefined;
  }

  setEndpoint(id: string, config: Partial<EndpointConfig>): EndpointConfig | undefined {
    const existing = this.endpoints.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...config, id };
    this.endpoints.set(id, updated);
    this.scheduleProjectSave();
    return updated;
  }

  setEndpoints(endpoints: EndpointConfig[]): void {
    if (endpoints.length > 0) {
      const specId = endpoints[0].specId;
      for (const [id, ep] of this.endpoints) {
        if (ep.specId === specId) {
          this.endpoints.delete(id);
        }
      }
    }
    for (const ep of endpoints) {
      this.endpoints.set(ep.id, ep);
    }
    this.scheduleProjectSave();
  }

  bulkUpdateEndpoints(updates: Record<string, Partial<EndpointConfig>>): EndpointConfig[] {
    const results: EndpointConfig[] = [];
    for (const [id, config] of Object.entries(updates)) {
      const existing = this.endpoints.get(id);
      if (existing) {
        const updated = { ...existing, ...config, id };
        this.endpoints.set(id, updated);
        results.push(updated);
      }
    }
    this.scheduleProjectSave();
    return results;
  }

  // ── Presets ──

  getPresets(): Preset[] {
    return Array.from(this.presets.values());
  }

  getPreset(name: string): Preset | undefined {
    return this.presets.get(name);
  }

  setPreset(preset: Preset): void {
    this.presets.set(preset.name, preset);
    this.scheduleProjectSave();
  }

  deletePreset(name: string): boolean {
    const deleted = this.presets.delete(name);
    if (deleted) this.scheduleProjectSave();
    return deleted;
  }

  applyPreset(name: string): EndpointConfig[] {
    const preset = this.presets.get(name);
    if (!preset) return [];
    return this.bulkUpdateEndpoints(preset.endpoints);
  }

  // ── Saved Responses ──

  getSavedResponses(): SavedResponse[] {
    return Array.from(this.savedResponses.values());
  }

  addSavedResponse(response: SavedResponse): void {
    this.savedResponses.set(response.id, response);
    this.scheduleProjectSave();
  }

  updateSavedResponse(id: string, data: Omit<SavedResponse, 'id' | 'createdAt'>): SavedResponse | null {
    const existing = this.savedResponses.get(id);
    if (!existing) return null;
    const updated: SavedResponse = { ...existing, ...data };
    this.savedResponses.set(id, updated);
    this.scheduleProjectSave();
    return updated;
  }

  deleteSavedResponse(id: string): boolean {
    const deleted = this.savedResponses.delete(id);
    if (deleted) this.scheduleProjectSave();
    return deleted;
  }

  // ── Export / Import ──

  exportData() {
    const project = this.activeProjectId
      ? this.projects.get(this.activeProjectId)
      : undefined;
    return {
      version: 2,
      config: this.getConfig(),
      project,
      specs: this.getSpecs(),
      endpoints: this.getEndpoints(),
      presets: this.getPresets(),
      exportedAt: new Date().toISOString(),
    };
  }

  async importData(data: {
    config?: GlobalConfig;
    endpoints?: EndpointConfig[];
    presets?: Preset[];
    specs?: ProjectSpec[];
  }): Promise<void> {
    if (data.config?.proxyPort !== undefined) {
      this.proxyPort = data.config.proxyPort;
    }
    if (data.specs) {
      this.specs.clear();
      for (const s of data.specs) this.specs.set(s.id, s);
    }
    if (data.endpoints) {
      this.endpoints.clear();
      for (const ep of data.endpoints) this.endpoints.set(ep.id, ep);
    }
    if (data.presets) {
      this.presets.clear();
      for (const p of data.presets) this.presets.set(p.name, p);
    }
    this.scheduleGlobalSave();
    this.scheduleProjectSave();
  }
}

export const store = new ConfigStore();
