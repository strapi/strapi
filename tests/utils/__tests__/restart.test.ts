import { createServer, type Server, type Socket } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, test } from 'vitest';

import { isServerHealthy } from '../restart';

const listen = (server: Server) =>
  new Promise<string>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}/_health`);
    });
  });

describe('isServerHealthy', () => {
  const servers: Server[] = [];
  const sockets: Socket[] = [];

  afterEach(async () => {
    sockets.forEach((socket) => socket.destroy());
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
    servers.length = 0;
    sockets.length = 0;
  });

  test('is true when /_health answers OK', async () => {
    const server = createHttpServer((_req, res) => {
      res.statusCode = 204;
      res.end();
    });
    servers.push(server);

    expect(await isServerHealthy(await listen(server))).toBe(true);
  });

  test('is false when nothing listens', async () => {
    const server = createHttpServer();
    const url = await listen(server);
    await new Promise((resolve) => server.close(resolve));

    expect(await isServerHealthy(url)).toBe(false);
  });

  // What a probe meets when it reaches `strapi develop` while it replaces its worker: the
  // connection is accepted and never answered. Unbounded, Node's fetch waits 300 s for headers.
  test('gives up on a connection that is never answered', async () => {
    const server = createServer((socket) => {
      sockets.push(socket);
    });
    servers.push(server);
    const url = await listen(server);

    const start = Date.now();
    expect(await isServerHealthy(url)).toBe(false);
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
