import { Hono } from 'hono';
import type { Preset } from '@interceptr/shared';
import { store } from '../config/store.js';
import { recompileRoutes } from './helpers.js';

const presets = new Hono();

presets.get('/', (c) => {
  return c.json({ data: store.getPresets() });
});

presets.post('/', async (c) => {
  const body = await c.req.json<Omit<Preset, 'createdAt'>>();
  const preset: Preset = {
    ...body,
    createdAt: new Date().toISOString(),
  };
  store.setPreset(preset);
  return c.json({ data: preset }, 201);
});

presets.delete('/:name', (c) => {
  const name = decodeURIComponent(c.req.param('name'));
  const deleted = store.deletePreset(name);
  if (!deleted) return c.json({ error: 'Preset not found' }, 404);
  return c.json({ data: { message: 'Preset deleted' } });
});

presets.post('/:name/apply', (c) => {
  const name = decodeURIComponent(c.req.param('name'));
  const updated = store.applyPreset(name);
  if (!updated.length) return c.json({ error: 'Preset not found or no endpoints matched' }, 404);
  recompileRoutes();
  return c.json({ data: updated });
});

export default presets;
