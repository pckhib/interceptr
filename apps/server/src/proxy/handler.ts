import { nanoid } from 'nanoid';
import type { EndpointConfig, ProxyLogEntry } from '@interceptr/shared';
import { matchRequest, getDefaultUpstreamUrl } from './matcher.js';
import { logBuffer } from '../logging/ring-buffer.js';
import { sseEmitter } from '../logging/sse.js';

const requestCounts = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDelay(endpoint: EndpointConfig): number {
  if (!endpoint.delay) return 0;
  const { ms, jitterMs } = endpoint.delay;
  const jitter = jitterMs ? Math.random() * jitterMs * 2 - jitterMs : 0;
  return Math.max(0, ms + jitter);
}

function checkConditionalRules(endpoint: EndpointConfig, reqHeaders: Headers): EndpointConfig | null {
  if (!endpoint.conditionalRules?.length) return null;

  const count = (requestCounts.get(endpoint.id) ?? 0) + 1;
  requestCounts.set(endpoint.id, count);

  for (const rule of endpoint.conditionalRules) {
    if (!rule.enabled) continue;

    if (rule.type === 'nth-request') {
      const config = rule.config as { n: number };
      if (count % config.n === 0) {
        return { ...endpoint, mode: 'mock', mock: rule.response };
      }
    }

    if (rule.type === 'random-failure') {
      const config = rule.config as { percentage: number };
      if (Math.random() * 100 < config.percentage) {
        return { ...endpoint, mode: 'mock', mock: rule.response };
      }
    }

    if (rule.type === 'header-match') {
      const config = rule.config as { header: string; pattern: string };
      const headerValue = reqHeaders.get(config.header);
      if (headerValue && new RegExp(config.pattern).test(headerValue)) {
        return { ...endpoint, mode: 'mock', mock: rule.response };
      }
    }
  }

  return null;
}

export async function handleProxyRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const startTime = Date.now();

  const match = matchRequest(req.method, url.pathname);
  let endpoint = match?.endpoint;
  const upstreamUrl = match?.upstreamUrl ?? getDefaultUpstreamUrl();

  if (endpoint) {
    const override = checkConditionalRules(endpoint, req.headers);
    if (override) endpoint = override;
  }

  const mode = endpoint?.mode ?? 'passthrough';

  let response: Response;

  try {
    if (mode === 'mock' && endpoint?.mock) {
      const headers = new Headers(endpoint.mock.headers);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      response = new Response(endpoint.mock.body, {
        status: endpoint.mock.statusCode,
        headers,
      });
    } else if (upstreamUrl) {
      if (mode === 'delay' && endpoint) {
        await sleep(getDelay(endpoint));
      }

      const target = new URL(url.pathname + url.search, upstreamUrl);
      const upstreamHeaders = new Headers(req.headers);
      upstreamHeaders.delete('host');

      const upstreamReq = new Request(target.toString(), {
        method: req.method,
        headers: upstreamHeaders,
        body: req.body,
        redirect: 'follow',
      });

      response = await fetch(upstreamReq);
    } else {
      response = new Response(
        JSON.stringify({ error: 'No matching endpoint or upstream URL configured' }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    response = new Response(JSON.stringify({ error: 'Proxy error', details: errorMessage }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const latencyMs = Date.now() - startTime;

  const responseBody = await response.clone().text().catch(() => '');

  const logEntry: ProxyLogEntry = {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    method: req.method,
    path: url.pathname,
    statusCode: response.status,
    latencyMs,
    mode,
    endpointId: endpoint?.id,
    requestHeaders: Object.fromEntries(req.headers.entries()),
    responseHeaders: Object.fromEntries(response.headers.entries()),
    responseBody: responseBody.slice(0, 10000),
  };

  logBuffer.push(logEntry);
  sseEmitter.emit(logEntry);

  return response;
}
