import { Hono } from 'hono';
import { getProxyStatus, startProxy, stopProxy } from '../proxy/lifecycle.js';

const proxy = new Hono();

proxy.get('/status', (c) => {
  return c.json({ data: getProxyStatus() });
});

proxy.post('/start', async (c) => {
  try {
    const result = await startProxy();
    return c.json({ data: { ...getProxyStatus(), ...result } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start proxy';
    return c.json({ error: message }, 500);
  }
});

proxy.post('/stop', async (c) => {
  try {
    await stopProxy();
    return c.json({ data: getProxyStatus() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to stop proxy';
    return c.json({ error: message }, 500);
  }
});

export default proxy;
