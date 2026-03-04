import type { ProxyMode } from './endpoint-config.js';

export interface ProxyLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  mode: ProxyMode;
  endpointId?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}
