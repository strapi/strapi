import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
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

const listen = async (server: net.Server) => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  return (server.address() as AddressInfo).port;
};

const close = async (server: net.Server) => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
};

// Self-signed certificate for the https origin, generated per run so no key is committed
const createCertificate = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-fetch-'));
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');

  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-subj',
        '/CN=strapi.test',
        '-days',
        '1',
        '-keyout',
        keyPath,
        '-out',
        certPath,
      ],
      { stdio: 'ignore' }
    );

    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

// Records every request it receives and answers with a fixed body
const createRecordingServer = (tls?: https.ServerOptions) => {
  const requests: ReceivedRequest[] = [];

  const handler: http.RequestListener = (req, res) => {
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
  };

  const server = tls ? https.createServer(tls, handler) : http.createServer(handler);

  return {
    requests,
    async listen() {
      return `${tls ? 'https' : 'http'}://127.0.0.1:${await listen(server)}`;
    },
    close: () => close(server),
  };
};

// Forward proxy that only tunnels CONNECT requests, always to the given origin port
const createTunnelProxy = (originPort: () => number) => {
  const tunnels: string[] = [];
  // Tunnelled sockets are detached from the server, so they are closed by hand
  const sockets = new Set<net.Socket>();

  const server = http.createServer((_req, res) => {
    res.writeHead(405).end();
  });

  server.on('connect', (req, socket: net.Socket, head) => {
    tunnels.push(req.url ?? '');

    const origin = net.connect(originPort(), '127.0.0.1', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      origin.write(head);
      origin.pipe(socket);
      socket.pipe(origin);
    });

    sockets.add(socket).add(origin);
    origin.on('error', () => socket.destroy());
    socket.on('error', () => origin.destroy());
  });

  return {
    tunnels,
    async listen() {
      return `http://127.0.0.1:${await listen(server)}`;
    },
    async close() {
      sockets.forEach((socket) => socket.destroy());
      await close(server);
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

  // A stream has no length of its own, so dropping its Content-Length would send it chunked
  it('keeps the Content-Length of a proxied stream body', async () => {
    const strapiFetch = createStrapiFetch(createStrapi({ 'server.proxy.global': proxyUrl }), {
      logs: false,
    });
    const body = JSON.stringify({ hello: 'world' });

    const response = await strapiFetch(`${TARGET_URL}/stream`, {
      method: 'POST',
      body: Readable.toWeb(Readable.from([body])) as ReadableStream,
      headers: { 'content-length': String(Buffer.byteLength(body)) },
      duplex: 'half',
    } as RequestInit);

    expect(response.status).toBe(200);
    expect(proxy.requests).toEqual([
      expect.objectContaining({
        method: 'POST',
        contentLength: String(Buffer.byteLength(body)),
        body,
      }),
    ]);
  });

  describe('with an https target', () => {
    const origin = createRecordingServer(createCertificate());
    let originPort: number;
    // https requests go through a CONNECT tunnel to the origin
    const tunnelProxy = createTunnelProxy(() => originPort);
    let tunnelProxyUrl: string;

    beforeAll(async () => {
      originPort = Number(new URL(await origin.listen()).port);
      tunnelProxyUrl = await tunnelProxy.listen();
    });

    afterAll(async () => {
      await tunnelProxy.close();
      await origin.close();
    });

    it('tunnels the request through the configured proxy', async () => {
      const strapiFetch = createStrapiFetch(
        createStrapi({
          // The origin certificate is self-signed
          'server.proxy.fetch': { uri: tunnelProxyUrl, requestTls: { rejectUnauthorized: false } },
        }),
        { logs: false }
      );

      const response = await strapiFetch('https://strapi.test/secure');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('ok');
      expect(tunnelProxy.tunnels).toEqual(['strapi.test:443']);
      expect(origin.requests).toEqual([expect.objectContaining({ method: 'GET', url: '/secure' })]);
    });
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
