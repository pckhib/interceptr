import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { logBuffer } from '../logging/ring-buffer.js';
import { sseEmitter } from '../logging/sse.js';

const logs = new Hono();

logs.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') ?? '100', 10);
  const entries = logBuffer.getRecent(limit);
  return c.json({ data: { entries, total: logBuffer.size } });
});

logs.get('/stream', (c) => {
  return streamSSE(c, async (stream) => {
    const removeClient = sseEmitter.addClient((data) => {
      stream.writeSSE({ data, event: 'log' }).catch(() => {});
    });

    stream.onAbort(() => {
      removeClient();
    });

    await stream.writeSSE({ data: 'connected', event: 'connected' });

    // Keep alive
    while (true) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: '', event: 'ping' });
    }
  });
});

logs.delete('/', (c) => {
  logBuffer.clear();
  return c.json({ data: { message: 'Logs cleared' } });
});

export default logs;
