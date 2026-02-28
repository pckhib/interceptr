import { describe, it, expect, beforeEach } from 'vitest';
import { compileRoutes, matchRequest, getDefaultUpstreamUrl } from './matcher.js';
import type { EndpointConfig, ProjectSpec } from '@interceptr/shared';

function makeSpec(overrides: Partial<ProjectSpec> = {}): ProjectSpec {
  return {
    id: 'spec-1',
    name: 'Test',
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

describe('compileRoutes / matchRequest', () => {
  beforeEach(() => {
    // Reset compiled state before each test
    compileRoutes([], new Map());
  });

  describe('basic matching', () => {
    it('matches a simple literal path', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ method: 'GET', path: '/users' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      const result = matchRequest('GET', '/users');
      expect(result).toBeDefined();
      expect(result!.endpoint.id).toBe('ep-1');
    });

    it('returns undefined for unknown path', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ path: '/users' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('GET', '/unknown')).toBeUndefined();
    });

    it('returns undefined for wrong method', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ method: 'GET', path: '/users' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('POST', '/users')).toBeUndefined();
    });

    it('is case-insensitive for method matching', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ method: 'GET', path: '/users' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('get', '/users')).toBeDefined();
    });

    it('matches path with trailing slash', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ path: '/users' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('GET', '/users/')).toBeDefined();
    });
  });

  describe('path parameters', () => {
    it('matches OpenAPI-style {id} path params', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ path: '/users/{id}' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('GET', '/users/123')).toBeDefined();
      expect(matchRequest('GET', '/users/abc-def')).toBeDefined();
    });

    it('does not match param segment across slashes', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ path: '/users/{id}' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('GET', '/users/123/extra')).toBeUndefined();
    });

    it('matches mixed literal and param path', () => {
      const spec = makeSpec();
      const ep = makeEndpoint({ path: '/users/{id}/posts' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      expect(matchRequest('GET', '/users/42/posts')).toBeDefined();
      expect(matchRequest('GET', '/users/42/comments')).toBeUndefined();
    });
  });

  describe('specificity ordering', () => {
    it('prefers literal routes over param routes', () => {
      const spec = makeSpec();
      const literal = makeEndpoint({ id: 'ep-literal', path: '/users/me' });
      const param = makeEndpoint({ id: 'ep-param', path: '/users/{id}' });
      compileRoutes([param, literal], new Map([['spec-1', spec]]));

      const result = matchRequest('GET', '/users/me');
      expect(result!.endpoint.id).toBe('ep-literal');
    });
  });

  describe('active spec filtering', () => {
    it('only compiles routes from active specs', () => {
      const inactiveSpec = makeSpec({ id: 'spec-inactive', active: false });
      const ep = makeEndpoint({ specId: 'spec-inactive', path: '/secret' });
      compileRoutes([ep], new Map([['spec-inactive', inactiveSpec]]));

      expect(matchRequest('GET', '/secret')).toBeUndefined();
    });

    it('compiles routes from active spec only when multiple specs exist', () => {
      const active = makeSpec({ id: 'spec-active', active: true });
      const inactive = makeSpec({ id: 'spec-inactive', active: false });
      const ep1 = makeEndpoint({ id: 'ep-active', specId: 'spec-active', path: '/yes' });
      const ep2 = makeEndpoint({ id: 'ep-inactive', specId: 'spec-inactive', path: '/no' });
      compileRoutes([ep1, ep2], new Map([
        ['spec-active', active],
        ['spec-inactive', inactive],
      ]));

      expect(matchRequest('GET', '/yes')).toBeDefined();
      expect(matchRequest('GET', '/no')).toBeUndefined();
    });
  });

  describe('upstreamUrl', () => {
    it('returns the spec upstreamUrl with the matched endpoint', () => {
      const spec = makeSpec({ upstreamUrl: 'https://backend.internal' });
      const ep = makeEndpoint({ path: '/items' });
      compileRoutes([ep], new Map([['spec-1', spec]]));

      const result = matchRequest('GET', '/items');
      expect(result!.upstreamUrl).toBe('https://backend.internal');
    });
  });

  describe('getDefaultUpstreamUrl', () => {
    it('returns the first active spec upstream URL', () => {
      const spec = makeSpec({ upstreamUrl: 'https://default.api.com' });
      compileRoutes([], new Map([['spec-1', spec]]));
      expect(getDefaultUpstreamUrl()).toBe('https://default.api.com');
    });

    it('returns null when no active specs', () => {
      compileRoutes([], new Map());
      expect(getDefaultUpstreamUrl()).toBeNull();
    });

    it('returns null when all specs are inactive', () => {
      const spec = makeSpec({ active: false });
      compileRoutes([], new Map([['spec-1', spec]]));
      expect(getDefaultUpstreamUrl()).toBeNull();
    });
  });

  describe('multiple methods on same path', () => {
    it('matches GET and POST independently', () => {
      const spec = makeSpec();
      const get = makeEndpoint({ id: 'get-ep', method: 'GET', path: '/items' });
      const post = makeEndpoint({ id: 'post-ep', method: 'POST', path: '/items' });
      compileRoutes([get, post], new Map([['spec-1', spec]]));

      expect(matchRequest('GET', '/items')!.endpoint.id).toBe('get-ep');
      expect(matchRequest('POST', '/items')!.endpoint.id).toBe('post-ep');
      expect(matchRequest('DELETE', '/items')).toBeUndefined();
    });
  });
});
