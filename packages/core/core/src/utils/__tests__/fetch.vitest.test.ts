import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Core } from '@strapi/types';
import { createStrapiFetch } from '../fetch';

// Unresolvable host: a response can only come from the proxy
const TARGET_URL = 'http://strapi.test';

interface ReceivedRequest {
  method?: string;
  url?: string;
  contentLength?: string;
  body: string;
}

const createStrapi = (config: Record<string, unknown>) =>
  ({
    config: { get: vi.fn((key: string) => config[key]) },
    log: { debug: vi.fn(), info: vi.fn() },
  }) as unknown as Core.Strapi;

// Records every request it receives and answers with a fixed body
const createRecordingServer = () => {
  const requests: ReceivedRequest[] = [];

  const server = http.createServer((req, res) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      requests.push({
        method: req.method,
        url: req.url,
        contentLength: req.headers['content-length'],
        body,
      });
      res.end('ok');
    });
  });

  return {
    requests,
    async listen() {
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
      });

      return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    },
    async close() {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
};

describe('createStrapiFetch', () => {
  // Plain http requests are sent to a forward proxy with an absolute URL
  const proxy = createRecordingServer();
  let proxyUrl: string;

  beforeAll(async () => {
    proxyUrl = await proxy.listen();
  });

  beforeEach(() => {
    proxy.requests.length = 0;
  });

  afterAll(async () => {
    await proxy.close();
  });

  it('does not set a dispatcher when no proxy is configured', () => {
    const strapiFetch = createStrapiFetch(createStrapi({}), { logs: false });

    expect(strapiFetch.dispatcher).toBeUndefined();
  });

  it.each([
    ['a url string', () => `${TARGET_URL}/string`, 'GET'],
    ['a Request object', () => new Request(`${TARGET_URL}/request`, { method: 'POST' }), 'POST'],
  ])('routes requests made with %s through the configured proxy', async (_, getInput, method) => {
    const strapiFetch = createStrapiFetch(createStrapi({ 'server.proxy.global': proxyUrl }), {
      logs: false,
    });
    const input = getInput();

    const response = await strapiFetch(input);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
    expect(proxy.requests).toEqual([
      expect.objectContaining({ method, url: typeof input === 'string' ? input : input.url }),
    ]);
  });

  it.each([
    [
      'init headers',
      (body: string) =>
        [
          `${TARGET_URL}/init`,
          {
            method: 'POST',
            body,
            headers: { 'content-length': String(Buffer.byteLength(body)) },
          },
        ] as const,
    ],
    [
      'a Request object',
      (body: string) =>
        [
          new Request(`${TARGET_URL}/request`, {
            method: 'POST',
            body,
            headers: { 'content-length': String(Buffer.byteLength(body)) },
          }),
        ] as const,
    ],
  ])('proxies a request that sets its own Content-Length in %s', async (_, getArgs) => {
    const strapiFetch = createStrapiFetch(createStrapi({ 'server.proxy.global': proxyUrl }), {
      logs: false,
    });
    const body = JSON.stringify({ hello: 'world' });

    const response = await strapiFetch(...getArgs(body));

    expect(response.status).toBe(200);
    expect(proxy.requests).toEqual([
      expect.objectContaining({
        method: 'POST',
        contentLength: String(Buffer.byteLength(body)),
        body,
      }),
    ]);
  });

  // Loading undici's main entry replaces the dispatcher used by Node's built-in fetch, which then
  // rejects requests that set their own Content-Length (https://github.com/nodejs/undici/issues/5500)
  it('leaves global fetch able to send a request that sets Content-Length', async () => {
    const server = createRecordingServer();
    const url = await server.listen();

    try {
      const body = JSON.stringify({ hello: 'world' });
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(body)),
        },
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('ok');
    } finally {
      await server.close();
    }
  });
});
