import { EventEmitter } from 'events';
import type { Context } from 'koa';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { handlerControllerFactory } from '../utils';

// Match the CommonJS ws export used by the compiled Strapi server.
vi.mock('ws', async () => {
  const { createRequire } = await import('node:module');
  const ws: typeof import('ws') = createRequire(import.meta.url)('ws');
  return { WebSocket: ws, WebSocketServer: ws.WebSocketServer };
});

const originalStrapi = Object.getOwnPropertyDescriptor(globalThis, 'strapi');

const createOwner = () => ({
  server: { httpServer: { headersTimeout: 60_000, requestTimeout: 300_000 } },
  db: { lifecycles: { disable: vi.fn(), enable: vi.fn() } },
  log: { info: vi.fn(), error: vi.fn() },
});

const setOwner = (owner: ReturnType<typeof createOwner>) => {
  Object.defineProperty(globalThis, 'strapi', {
    value: owner,
    writable: true,
    configurable: true,
  });
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const connect = async (onClose: () => Promise<void>) => {
  const client = Object.assign(new EventEmitter(), {
    terminate: vi.fn(),
    send: vi.fn(),
  });
  const destroy = vi.fn();
  const ctx = {
    headers: { upgrade: 'websocket' },
    req: { socket: { destroy } },
    request: { socket: {} },
  } as unknown as Context;
  const servers: WebSocketServer[] = [];
  vi.spyOn(WebSocketServer.prototype, 'handleUpgrade').mockImplementation(function handleUpgrade(
    this: WebSocketServer,
    request,
    _socket,
    _head,
    onUpgrade
  ) {
    servers.push(this);
    onUpgrade(client as unknown as WebSocket, request);
  });
  await handlerControllerFactory(() => ({ onClose }))({ verify: vi.fn() })(ctx);
  expect(client.listenerCount('close')).toBe(1);
  const close = client.listeners('close')[0] as (code: number, reason: Buffer) => Promise<void>;
  servers.forEach((server) => server.close());
  return { close: () => close(1000, Buffer.alloc(0)), client, destroy };
};

afterEach(() => {
  vi.restoreAllMocks();
  if (originalStrapi) {
    Object.defineProperty(globalThis, 'strapi', originalStrapi);
  } else {
    Reflect.deleteProperty(globalThis, 'strapi');
  }
});

describe('transfer WebSocket close ownership', () => {
  test('restores lifecycles and timeouts for the active connection owner', async () => {
    const owner = createOwner();
    setOwner(owner);
    const connection = await connect(async () => {});
    expect(owner.db.lifecycles.disable).toHaveBeenCalledTimes(1);
    expect(owner.server.httpServer.headersTimeout).toBe(0);
    await expect(connection.close()).resolves.toBeUndefined();
    expect(owner.db.lifecycles.enable).toHaveBeenCalledTimes(1);
    expect(owner.server.httpServer).toEqual({
      headersTimeout: 60_000,
      requestTimeout: 300_000,
    });
  });

  test('settles a delayed close after the server instance has been removed', async () => {
    const owner = createOwner();
    setOwner(owner);
    const gate = deferred();
    const connection = await connect(() => gate.promise);
    const closing = connection.close();
    Reflect.deleteProperty(globalThis, 'strapi');
    gate.resolve();
    await expect(closing).resolves.toBeUndefined();
    expect(owner.db.lifecycles.enable).not.toHaveBeenCalled();
  });

  test('does not restore a replacement server from an old connection', async () => {
    const owner = createOwner();
    setOwner(owner);
    const gate = deferred();
    const connection = await connect(() => gate.promise);
    const closing = connection.close();
    const replacement = createOwner();
    replacement.server.httpServer.headersTimeout = 1234;
    replacement.server.httpServer.requestTimeout = 5678;
    setOwner(replacement);
    gate.resolve();
    await expect(closing).resolves.toBeUndefined();
    expect(replacement.db.lifecycles.enable).not.toHaveBeenCalled();
    expect(replacement.server.httpServer).toEqual({
      headersTimeout: 1234,
      requestTimeout: 5678,
    });
    expect(owner.db.lifecycles.enable).not.toHaveBeenCalled();
  });

  test('reports a late handler rejection without consulting the removed instance', async () => {
    const owner = createOwner();
    setOwner(owner);
    const gate = deferred();
    const connection = await connect(() => gate.promise);
    const closing = connection.close();
    Reflect.deleteProperty(globalThis, 'strapi');
    const failure = new Error('late close failure');
    gate.reject(failure);
    await expect(closing).resolves.toBeUndefined();
    expect(owner.log.error).toHaveBeenCalledWith(failure);
    expect(connection.client.terminate).toHaveBeenCalledTimes(1);
    expect(connection.destroy).toHaveBeenCalledTimes(1);
    expect(owner.db.lifecycles.enable).not.toHaveBeenCalled();
  });
});
