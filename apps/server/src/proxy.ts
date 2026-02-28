import { Hono } from 'hono';
import { handleProxyRequest } from './proxy/handler.js';

export const proxyApp = new Hono();

proxyApp.all('*', async (c) => {
  const response = await handleProxyRequest(c.req.raw);
  return response;
});
