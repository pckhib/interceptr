import { Hono } from 'hono';
import { store } from '../config/store.js';
import { recompileRoutes } from './helpers.js';

const projects = new Hono();

projects.get('/', (c) => {
  return c.json({ data: store.listProjects() });
});

projects.post('/', async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) return c.json({ error: 'Project name is required' }, 400);
  const project = store.createProject(name.trim());
  return c.json({ data: project }, 201);
});

projects.get('/active', (c) => {
  const project = store.getActiveProject();
  if (!project) return c.json({ error: 'No active project' }, 404);
  return c.json({ data: project });
});

projects.put('/active', async (c) => {
  const { projectId } = await c.req.json<{ projectId: string }>();
  const switched = await store.switchProject(projectId);
  if (!switched) return c.json({ error: 'Project not found' }, 404);
  recompileRoutes();
  return c.json({ data: store.getActiveProject() });
});

projects.put('/:id', async (c) => {
  const id = c.req.param('id');
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) return c.json({ error: 'Project name is required' }, 400);
  const project = store.renameProject(id, name.trim());
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json({ data: project });
});

projects.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = await store.deleteProject(id);
  if (!deleted) return c.json({ error: 'Cannot delete active project' }, 400);
  return c.json({ data: { message: 'Project deleted' } });
});

export default projects;
