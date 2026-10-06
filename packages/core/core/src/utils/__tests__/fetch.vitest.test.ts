import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { Core } from '@strapi/types';
import { createStrapiFetch } from '../fetch';

// Unresolvable host: a response can only come from the proxy
const TARGET_URL = 'http://strapi.test';

const createStrapi = (config: Record<string, unknown>) =>
  ({
    config: { get: vi.fn((key: string) => config[key]) },
    log: { debug: vi.fn(), info: vi.fn() },
  }) as unknown as Core.Strapi;

describe('createStrapiFetch', () => {
  let proxyUrl: string;

  // Fake forward proxy: answers plain http requests (sent with an absolute URL) itself
  const proxy = http.createServer((req, res) => {
    res.end(`proxied:${req.method} ${req.url}`);
  });

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      proxy.listen(0, '127.0.0.1', () => resolve());
    });
    proxyUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      proxy.close(() => resolve());
    });
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
    expect(await response.text()).toBe(
      `proxied:${method} ${typeof input === 'string' ? input : input.url}`
    );
  });
});
