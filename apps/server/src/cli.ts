#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { app } from './app.js';
import { store } from './config/store.js';
import { logBuffer } from './logging/ring-buffer.js';
import { recompileRoutes } from './routes/helpers.js';
import { startProxy, stopProxy } from './proxy/lifecycle.js';
import { version } from './version.js';

function parseArgs(): { port: number } {
  const args = process.argv.slice(2);
  let port = 3001;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    let raw: string | undefined;

    if (arg === '--port' || arg === '-p') {
      raw = args[++i];
    } else if (arg.startsWith('--port=')) {
      raw = arg.slice('--port='.length);
    }

    if (raw !== undefined) {
      const parsed = parseInt(raw, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
        console.error(`Invalid port: "${raw}". Must be a number between 1 and 65535.`);
        process.exit(1);
      }
      port = parsed;
    }
  }

  return { port };
}

const { port: MANAGEMENT_PORT } = parseArgs();

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
