import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { Core } from '@strapi/types';
import { createStrapiFetch } from '../fetch';

const listen = (server: http.Server) =>
  new Promise<string>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    });
  });

const close = (server: http.Server) =>
  new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

const createStrapi = (config: Record<string, unknown>) =>
  ({
    config: { get: vi.fn((key: string) => config[key]) },
    log: { debug: vi.fn(), info: vi.fn() },
  }) as unknown as Core.Strapi;

describe('createStrapiFetch', () => {
  const proxiedUrls: string[] = [];
  let targetUrl: string;
  let proxyUrl: string;

  const target = http.createServer((req, res) => {
    res.end(`target:${req.method}`);
  });

  // Minimal forward proxy: plain http requests are sent with an absolute URL
  const proxy = http.createServer((req, res) => {
    proxiedUrls.push(req.url!);

    const upstream = http.request(req.url!, { method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode!, r.headers);
      r.pipe(res);
    });

    req.pipe(upstream);
  });

  beforeAll(async () => {
    targetUrl = await listen(target);
    proxyUrl = await listen(proxy);
  });

  afterAll(async () => {
    await Promise.all([close(target), close(proxy)]);
  });

  it('does not set a dispatcher when no proxy is configured', () => {
    const strapiFetch = createStrapiFetch(createStrapi({}), { logs: false });

    expect(strapiFetch.dispatcher).toBeUndefined();
  });

  it.each([
    ['a url string', () => `${targetUrl}/string`],
    ['a Request object', () => new Request(`${targetUrl}/request`, { method: 'POST' })],
  ])('routes requests made with %s through the configured proxy', async (_, getInput) => {
    const strapiFetch = createStrapiFetch(createStrapi({ 'server.proxy.global': proxyUrl }), {
      logs: false,
    });
    const input = getInput();

    const response = await strapiFetch(input);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      `target:${typeof input === 'string' ? 'GET' : input.method}`
    );
    expect(proxiedUrls).toContain(typeof input === 'string' ? input : input.url);
  });
});
