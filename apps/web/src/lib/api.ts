import type {
  EndpointConfig,
  ExportData,
  GlobalConfig,
  Preset,
  Project,
  ProjectSpec,
  ProxyLogEntry,
} from '@interceptr/shared';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed: ${res.status}`);
  return json.data;
}

export const api = {
  health: () => request<{ status: string; version: string }>('/health'),
  projects: {
    list: () => request<Project[]>('/projects'),
    create: (name: string) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
    getActive: () => request<Project & { specs: ProjectSpec[] }>('/projects/active'),
    switchActive: (projectId: string) =>
      request<Project & { specs: ProjectSpec[] }>('/projects/active', {
        method: 'PUT',
        body: JSON.stringify({ projectId }),
      }),
    rename: (id: string, name: string) =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    delete: (id: string) =>
      request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
  },
  specs: {
    list: () => request<ProjectSpec[]>('/specs'),
    upload: (spec: object, name: string, upstreamUrl?: string) =>
      request<{ spec: ProjectSpec; endpointCount: number }>('/specs', {
        method: 'POST',
        body: JSON.stringify({ spec, name, upstreamUrl }),
      }),
    uploadFromUrl: (url: string, name: string) =>
      request<{ spec: ProjectSpec; endpointCount: number }>('/specs/url', {
        method: 'POST',
        body: JSON.stringify({ url, name }),
      }),
    update: (specId: string, data: { name?: string; upstreamUrl?: string; active?: boolean }) =>
      request<ProjectSpec>(`/specs/${specId}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggle: (specId: string) =>
      request<ProjectSpec>(`/specs/${specId}/toggle`, { method: 'PUT' }),
    delete: (specId: string) =>
      request<{ message: string }>(`/specs/${specId}`, { method: 'DELETE' }),
    reimport: (specId: string, spec?: object) =>
      request<{ spec: ProjectSpec; endpointCount: number }>(`/specs/${specId}/reimport`, {
        method: 'POST',
        body: spec ? JSON.stringify({ spec }) : '{}',
      }),
  },
  endpoints: {
    list: () => request<EndpointConfig[]>('/endpoints'),
    update: (id: string, config: Partial<EndpointConfig>) =>
      request<EndpointConfig>(`/endpoints/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      }),
    bulkUpdate: (updates: Record<string, Partial<EndpointConfig>>) =>
      request<EndpointConfig[]>('/endpoints/bulk', {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
  },
  config: {
    get: () => request<GlobalConfig>('/config'),
    update: (config: Partial<GlobalConfig>) =>
      request<GlobalConfig>('/config', { method: 'PUT', body: JSON.stringify(config) }),
    export: () => request<ExportData>('/config/export'),
    import: (data: object) =>
      request<{ message: string }>('/config/import', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  logs: {
    get: (limit = 100) =>
      request<{ entries: ProxyLogEntry[]; total: number }>(`/logs?limit=${limit}`),
    clear: () => request<{ message: string }>('/logs', { method: 'DELETE' }),
  },
  proxy: {
    status: () => request<{ running: boolean; port: number | null }>('/proxy/status'),
    start: () => request<{ running: boolean; port: number }>('/proxy/start', { method: 'POST' }),
    stop: () => request<{ running: boolean; port: number | null }>('/proxy/stop', { method: 'POST' }),
  },
  presets: {
    list: () => request<Preset[]>('/presets'),
    create: (preset: {
      name: string;
      description?: string;
      endpoints: Record<string, Partial<EndpointConfig>>;
    }) => request<Preset>('/presets', { method: 'POST', body: JSON.stringify(preset) }),
    delete: (name: string) =>
      request<{ message: string }>(`/presets/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    apply: (name: string) =>
      request<EndpointConfig[]>(`/presets/${encodeURIComponent(name)}/apply`, { method: 'POST' }),
  },
};
