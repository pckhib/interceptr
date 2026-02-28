import type { EndpointConfig, ProjectSpec } from '@interceptr/shared';

interface CompiledRoute {
  method: string;
  regex: RegExp;
  endpoint: EndpointConfig;
  upstreamUrl: string;
  specificity: number;
}

export interface MatchResult {
  endpoint: EndpointConfig;
  upstreamUrl: string;
}

let compiledRoutes: CompiledRoute[] = [];
let defaultUpstreamUrl: string | null = null;

export function compileRoutes(endpoints: EndpointConfig[], specs: Map<string, ProjectSpec>): void {
  // Pick the first active spec's upstream as the default for unmatched requests
  defaultUpstreamUrl = null;
  for (const spec of specs.values()) {
    if (spec.active) {
      defaultUpstreamUrl = spec.upstreamUrl;
      break;
    }
  }

  compiledRoutes = endpoints
    .filter((ep) => {
      const spec = specs.get(ep.specId);
      return spec?.active;
    })
    .map((endpoint) => {
      const spec = specs.get(endpoint.specId)!;
      const { regex, specificity } = pathToRegex(endpoint.path);
      return {
        method: endpoint.method,
        regex,
        endpoint,
        upstreamUrl: spec.upstreamUrl,
        specificity,
      };
    });
  compiledRoutes.sort((a, b) => b.specificity - a.specificity);
}

function pathToRegex(path: string): { regex: RegExp; specificity: number } {
  let specificity = 0;
  const parts = path.split('/').filter(Boolean);

  const regexParts = parts.map((part) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      return '([^/]+)';
    }
    specificity += 1;
    return escapeRegex(part);
  });

  const pattern = '^/' + regexParts.join('/') + '/?$';
  return { regex: new RegExp(pattern, 'i'), specificity };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchRequest(method: string, path: string): MatchResult | undefined {
  const upperMethod = method.toUpperCase();
  const pathname = new URL(path, 'http://localhost').pathname;

  for (const route of compiledRoutes) {
    if (route.method === upperMethod && route.regex.test(pathname)) {
      return { endpoint: route.endpoint, upstreamUrl: route.upstreamUrl };
    }
  }

  return undefined;
}

export function getDefaultUpstreamUrl(): string | null {
  return defaultUpstreamUrl;
}
