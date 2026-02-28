import { Hono } from 'hono';
import { store } from '../config/store.js';
import { recompileRoutes } from './helpers.js';

const endpoints = new Hono();

endpoints.get('/', (c) => {
  const specId = c.req.query('specId');
  let eps = store.getEndpoints();
  if (specId) {
    eps = eps.filter((ep) => ep.specId === specId);
  }
  return c.json({ data: eps });
});

endpoints.put('/bulk', async (c) => {
  const body = await c.req.json();
  const updated = store.bulkUpdateEndpoints(body);
  recompileRoutes();
  return c.json({ data: updated });
});

endpoints.put('/:id{.+}', async (c) => {
  const id = decodeURIComponent(c.req.param('id'));
  const body = await c.req.json();
  const updated = store.setEndpoint(id, body);
  if (!updated) return c.json({ error: 'Endpoint not found' }, 404);
  recompileRoutes();
  return c.json({ data: updated });
});

export default endpoints;
