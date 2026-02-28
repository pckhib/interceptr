import { Hono } from 'hono';
import { store } from '../config/store.js';
import { recompileRoutes } from './helpers.js';

const config = new Hono();

config.get('/', (c) => {
  return c.json({ data: store.getConfig() });
});

config.put('/', async (c) => {
  const body = await c.req.json();
  const updated = store.setConfig(body);
  return c.json({ data: updated });
});

config.get('/export', (c) => {
  return c.json({ data: store.exportData() });
});

config.post('/import', async (c) => {
  try {
    const body = await c.req.json();
    await store.importData(body);
    recompileRoutes();
    return c.json({ data: { message: 'Config imported successfully' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return c.json({ error: message }, 400);
  }
});

export default config;
