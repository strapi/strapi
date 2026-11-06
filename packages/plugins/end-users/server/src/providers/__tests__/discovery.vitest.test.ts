import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { checkDiscoveryDocument, DiscoveryError } from '../discovery';

const CAP = 1024 * 1024;

let server: Server | undefined;

const listen = async (handler: Parameters<typeof createServer>[1]) => {
  server = createServer(handler);
  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', resolve);
  });

  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
};

afterEach(async () => {
  server?.closeAllConnections();
  await new Promise((resolve) => {
    server?.close(resolve);
  });
  server = undefined;
});

describe('checkDiscoveryDocument size cap', () => {
  it('refuses a large Content-Length without reading the body', async () => {
    const closed = { value: false };

    const url = await listen((req, res) => {
      res.on('close', () => {
        closed.value = true;
      });
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': CAP * 4 });
      res.flushHeaders();
      // Send nothing of the body: a client that waited for it would sit until the time budget.
    });

    const started = Date.now();
    const error = await checkDiscoveryDocument(url).catch((e) => e);

    expect(error).toBeInstanceOf(DiscoveryError);
    expect(error.message).toBe('is not an OpenID discovery document');
    expect(Date.now() - started).toBeLessThan(2000);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(closed.value).toBe(true);
  });

  it('aborts a chunked response once it passes the cap', async () => {
    let written = 0;
    let closed = false;

    const url = await listen((req, res) => {
      res.on('close', () => {
        closed = true;
      });
      res.writeHead(200, { 'content-type': 'application/json' });

      const chunk = Buffer.alloc(64 * 1024, 'a');
      const pump = () => {
        while (!closed && !res.destroyed) {
          written += chunk.length;

          if (!res.write(chunk)) {
            res.once('drain', pump);
            return;
          }
        }
      };

      pump();
    });

    const started = Date.now();
    const error = await checkDiscoveryDocument(url).catch((e) => e);

    expect(error).toBeInstanceOf(DiscoveryError);
    expect(error.message).toBe('is not an OpenID discovery document');
    expect(Date.now() - started).toBeLessThan(2000);
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    expect(closed).toBe(true);
    // Socket buffers let some extra bytes through, but nowhere near an unbounded body.
    expect(written).toBeLessThan(CAP * 16);
  });

  it('still accepts a small valid document', async () => {
    const url = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ authorization_endpoint: 'https://a/b', token_endpoint: 'https://a/t' })
      );
    });

    await expect(checkDiscoveryDocument(url)).resolves.toBeUndefined();
  });
});
