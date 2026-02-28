import { serve, type ServerType } from '@hono/node-server';
import { proxyApp } from '../proxy.js';
import { store } from '../config/store.js';

let proxyServer: ServerType | null = null;
let currentPort: number | null = null;

export function getProxyStatus(): { running: boolean; port: number | null } {
  return { running: proxyServer !== null, port: currentPort };
}

export function startProxy(): Promise<{ port: number }> {
  return new Promise((resolve, reject) => {
    if (proxyServer) {
      resolve({ port: currentPort! });
      return;
    }

    const config = store.getConfig();
    const port = config.proxyPort;

    try {
      const server = serve({ fetch: proxyApp.fetch, port }, () => {
        currentPort = port;
        console.log(`Proxy server started on http://localhost:${port}`);
        resolve({ port });
      });
      proxyServer = server;

      server.on('error', (err: NodeJS.ErrnoException) => {
        proxyServer = null;
        currentPort = null;
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function stopProxy(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!proxyServer) {
      resolve();
      return;
    }

    proxyServer.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Proxy server stopped');
      proxyServer = null;
      currentPort = null;
      resolve();
    });
  });
}
