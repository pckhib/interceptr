import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { version } from './version.js';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import specs from './routes/specs.js';
import endpoints from './routes/endpoints.js';
import config from './routes/config.js';
import logs from './routes/logs.js';
import presets from './routes/presets.js';
import savedResponses from './routes/saved-responses.js';
import projects from './routes/projects.js';
import proxy from './routes/proxy.js';

export const app = new Hono();

app.use('*', cors());
app.use('*', logger());

app.route('/api/projects', projects);
app.route('/api/specs', specs);
app.route('/api/endpoints', endpoints);
app.route('/api/config', config);
app.route('/api/logs', logs);
app.route('/api/presets', presets);
app.route('/api/saved-responses', savedResponses);
app.route('/api/proxy', proxy);

app.get('/api/health', (c) => c.json({ data: { status: 'ok', version } }));

const publicDir = fileURLToPath(new URL('./public', import.meta.url));
if (existsSync(publicDir)) {
  app.use('/*', serveStatic({ root: publicDir }));
}
