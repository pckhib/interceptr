export type ProxyMode = 'passthrough' | 'delay' | 'mock';

export interface DelayConfig {
  ms: number;
  jitterMs?: number;
}

export interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ConditionalRule {
  id: string;
  name: string;
  type: 'nth-request' | 'random-failure' | 'header-match';
  config: NthRequestConfig | RandomFailureConfig | HeaderMatchConfig;
  response: MockResponse;
  enabled: boolean;
}

export interface NthRequestConfig {
  n: number;
}

export interface RandomFailureConfig {
  percentage: number;
}

export interface HeaderMatchConfig {
  header: string;
  pattern: string;
}

export interface SpecResponse {
  statusCode: number;
  name: string;
  description?: string;
  headers?: Record<string, string>;
  body?: string;
  schema?: object;
}

export interface EndpointConfig {
  id: string;
  specId: string;
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  tags: string[];
  mode: ProxyMode;
  delay?: DelayConfig;
  mock?: MockResponse;
  conditionalRules?: ConditionalRule[];
  responses?: SpecResponse[];
}
