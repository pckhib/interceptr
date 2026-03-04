import { Hono } from 'hono';
import type { SavedResponse } from '@interceptr/shared';
import { nanoid } from 'nanoid';
import { store } from '../config/store.js';

const savedResponses = new Hono();

savedResponses.get('/', (c) => {
  return c.json({ data: store.getSavedResponses() });
});

savedResponses.post('/', async (c) => {
  const body = await c.req.json<Omit<SavedResponse, 'id' | 'createdAt'>>();
  const response: SavedResponse = {
    ...body,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  store.addSavedResponse(response);
  return c.json({ data: response }, 201);
});

savedResponses.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Omit<SavedResponse, 'id' | 'createdAt'>>();
  const updated = store.updateSavedResponse(id, body);
  if (!updated) return c.json({ error: 'Saved response not found' }, 404);
  return c.json({ data: updated });
});

savedResponses.delete('/:id', (c) => {
  const id = c.req.param('id');
  const deleted = store.deleteSavedResponse(id);
  if (!deleted) return c.json({ error: 'Saved response not found' }, 404);
  return c.json({ data: { message: 'Saved response deleted' } });
});

export default savedResponses;
