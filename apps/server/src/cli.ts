#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { app } from './app.js';
import { store } from './config/store.js';
import { logBuffer } from './logging/ring-buffer.js';
import { recompileRoutes } from './routes/helpers.js';
import { startProxy, stopProxy } from './proxy/lifecycle.js';
import { version } from './version.js';

const MANAGEMENT_PORT = 3001;

function banner(lines: string[]): string {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const pad = (s: string) => `║ ${s.padEnd(width - 4)} ║`;
  const rule = '═'.repeat(width - 2);
  return [`╔${rule}╗`, ...lines.map(pad), `╚${rule}╝`].join('\n');
}

console.log('\n' + banner([
  `Interceptr v${version}`,
  '',
  `Management UI  http://localhost:${MANAGEMENT_PORT}`,
]) + '\n');

await store.load();
logBuffer.load();
recompileRoutes();

serve({ fetch: app.fetch, port: MANAGEMENT_PORT }, () => {
  console.log(`Management API running at http://localhost:${MANAGEMENT_PORT}`);
});

await startProxy();

async function shutdown() {
  console.log('\nShutting down...');
  await stopProxy();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
