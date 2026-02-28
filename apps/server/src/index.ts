import { serve } from '@hono/node-server';
import { app } from './app.js';
import { store } from './config/store.js';
import { logBuffer } from './logging/ring-buffer.js';
import { recompileRoutes } from './routes/helpers.js';
import { startProxy } from './proxy/lifecycle.js';

const MANAGEMENT_PORT = 3001;

async function main() {
  await store.load();
  logBuffer.load();
  recompileRoutes();

  serve({ fetch: app.fetch, port: MANAGEMENT_PORT }, () => {
    console.log(`Management API running at http://localhost:${MANAGEMENT_PORT}`);
  });

  await startProxy();
}

main().catch(console.error);
