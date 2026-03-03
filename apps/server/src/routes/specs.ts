import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import yaml from 'js-yaml';
import { store } from '../config/store.js';
import { parseOpenAPISpec } from '../openapi/parser.js';
import { recompileRoutes } from './helpers.js';

const specs = new Hono();

// List all specs in active project
specs.get('/', (c) => {
  return c.json({ data: store.getSpecs() });
});

// Upload spec from JSON body
specs.post('/', async (c) => {
  try {
    const { spec, name, upstreamUrl } = await c.req.json<{
      spec: object;
      name: string;
      upstreamUrl?: string;
    }>();

    if (!name?.trim()) return c.json({ error: 'Spec name is required' }, 400);

    const { metadata, endpoints } = await parseOpenAPISpec(spec);
    const specId = nanoid();

    const projectSpec = {
      id: specId,
      name: name.trim(),
      upstreamUrl: upstreamUrl?.trim() || 'http://localhost:8080',
      active: true,
      metadata,
    };

    const endpointsWithSpec = endpoints.map((ep) => ({
      ...ep,
      id: `${specId}:${ep.id}`,
      specId,
    }));

    store.addSpec(projectSpec, endpointsWithSpec);
    recompileRoutes();

    return c.json({ data: { spec: projectSpec, endpointCount: endpoints.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse spec';
    return c.json({ error: message }, 400);
  }
});

// Import spec from URL
specs.post('/url', async (c) => {
  try {
    const { url, name } = await c.req.json<{ url: string; name: string }>();

    if (!name?.trim()) return c.json({ error: 'Spec name is required' }, 400);
    if (!url || !/^https?:\/\//i.test(url)) {
      return c.json({ error: 'A valid http or https URL is required' }, 400);
    }

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json, application/x-yaml, text/yaml, */*' },
    });

    if (!res.ok) {
      return c.json({ error: `Failed to fetch spec: ${res.status} ${res.statusText}` }, 400);
    }

    const text = await res.text();
    const contentType = res.headers.get('content-type') ?? '';
    const isYaml = contentType.includes('yaml') || /\.ya?ml(\?|$)/i.test(url);

    let specBody: unknown;
    if (isYaml) {
      specBody = yaml.load(text);
    } else {
      try {
        specBody = JSON.parse(text);
      } catch {
        specBody = yaml.load(text);
      }
    }

    const { metadata, endpoints } = await parseOpenAPISpec(specBody as object);
    metadata.sourceUrl = url;

    // Auto-derive upstream URL from spec URL origin
    const derivedUpstream = new URL(url).origin;
    const specId = nanoid();

    const projectSpec = {
      id: specId,
      name: name.trim(),
      upstreamUrl: derivedUpstream,
      active: true,
      metadata,
    };

    const endpointsWithSpec = endpoints.map((ep) => ({
      ...ep,
      id: `${specId}:${ep.id}`,
      specId,
    }));

    store.addSpec(projectSpec, endpointsWithSpec);
    recompileRoutes();

    return c.json({ data: { spec: projectSpec, endpointCount: endpoints.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load spec from URL';
    return c.json({ error: message }, 400);
  }
});

// Reimport spec — re-fetch from sourceUrl or accept a new body
specs.post('/:specId/reimport', async (c) => {
  const specId = c.req.param('specId');
  const existing = store.getSpec(specId);
  if (!existing) return c.json({ error: 'Spec not found' }, 404);

  try {
    let specBody: object | undefined;

    // Check if a body was provided (file reimport)
    const contentType = c.req.header('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await c.req.json<{ spec?: object }>().catch(() => ({ spec: undefined }));
      if (body.spec) {
        specBody = body.spec;
      }
    }

    // If no body, try to re-fetch from sourceUrl
    if (!specBody) {
      const sourceUrl = existing.metadata.sourceUrl;
      if (!sourceUrl) {
        return c.json({ error: 'No source URL — upload a spec file instead' }, 400);
      }

      const res = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: 'application/json, application/x-yaml, text/yaml, */*' },
      });

      if (!res.ok) {
        return c.json({ error: `Failed to fetch spec: ${res.status} ${res.statusText}` }, 400);
      }

      const text = await res.text();
      const ct = res.headers.get('content-type') ?? '';
      const isYaml = ct.includes('yaml') || /\.ya?ml(\?|$)/i.test(sourceUrl);

      if (isYaml) {
        specBody = yaml.load(text) as object;
      } else {
        try {
          specBody = JSON.parse(text);
        } catch {
          specBody = yaml.load(text) as object;
        }
      }
    }

    const { metadata, endpoints } = await parseOpenAPISpec(specBody!);
    if (existing.metadata.sourceUrl) {
      metadata.sourceUrl = existing.metadata.sourceUrl;
    }

    const endpointsWithSpec = endpoints.map((ep) => ({
      ...ep,
      id: `${specId}:${ep.id}`,
      specId,
    }));

    store.reimportSpec(specId, metadata, endpointsWithSpec);
    recompileRoutes();

    return c.json({ data: { spec: store.getSpec(specId), endpointCount: endpoints.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reimport spec';
    return c.json({ error: message }, 400);
  }
});

// Update spec (name, upstreamUrl, active)
specs.put('/:specId', async (c) => {
  const specId = c.req.param('specId');
  const body = await c.req.json<{ name?: string; upstreamUrl?: string; active?: boolean; globalHeaders?: Record<string, string> }>();
  const updated = store.updateSpec(specId, body);
  if (!updated) return c.json({ error: 'Spec not found' }, 404);
  recompileRoutes();
  return c.json({ data: updated });
});

// Toggle spec active state
specs.put('/:specId/toggle', async (c) => {
  const specId = c.req.param('specId');
  const spec = store.getSpec(specId);
  if (!spec) return c.json({ error: 'Spec not found' }, 404);
  const updated = store.updateSpec(specId, { active: !spec.active });
  recompileRoutes();
  return c.json({ data: updated });
});

// Delete spec and its endpoints
specs.delete('/:specId', (c) => {
  const specId = c.req.param('specId');
  const deleted = store.removeSpec(specId);
  if (!deleted) return c.json({ error: 'Spec not found' }, 404);
  recompileRoutes();
  return c.json({ data: { message: 'Spec deleted' } });
});

export default specs;
