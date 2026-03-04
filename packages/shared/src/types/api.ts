import type { EndpointConfig } from './endpoint-config.js';
import type { ProxyLogEntry } from './proxy-log.js';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSpec {
  id: string;
  name: string;
  upstreamUrl: string;
  active: boolean;
  metadata: SpecMetadata;
  globalHeaders?: Record<string, string>;
}

export interface GlobalConfig {
  proxyPort: number;
  activeProjectId: string | null;
}

export interface SpecMetadata {
  title: string;
  version: string;
  endpointCount: number;
  uploadedAt: string;
  sourceUrl?: string;
}

export interface Preset {
  name: string;
  description?: string;
  endpoints: Record<string, Partial<EndpointConfig>>;
  createdAt: string;
}

export interface SavedResponse {
  id: string;
  name: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface LogsResponse {
  entries: ProxyLogEntry[];
  total: number;
}

export interface ExportData {
  version: number;
  config: GlobalConfig;
  project?: Project;
  specs: ProjectSpec[];
  endpoints: EndpointConfig[];
  presets: Preset[];
  exportedAt: string;
}
