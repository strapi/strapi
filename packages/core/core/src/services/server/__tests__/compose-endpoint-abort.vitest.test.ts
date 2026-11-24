import { AsyncLocalStorage } from 'node:async_hooks';
import Router from '@koa/router';
import { describe, expect, test, vi } from 'vitest';

import composeEndpoint from '../compose-endpoint';

/**
 * Minimal stand-in for the database abort context: reads are refused while the flow's signal is
 * aborted, unless the flow ran through `runWithoutAbortSignal`.
 */
const createStrapi = () => {
  const storage = new AsyncLocalStorage<{ signal: AbortSignal; written: boolean }>();

  const db = {
    runWithAbortSignal: (signal: AbortSignal, cb: () => unknown) =>
      storage.run({ signal, written: false }, cb),
    runWithoutAbortSignal: vi.fn((cb: () => unknown) => {
      const store = storage.getStore();
      if (store) {
        store.written = true;
      }
      return storage.exit(cb);
    }),
    async select() {
      const store = storage.getStore();
      if (store && !store.written && store.signal.aborted) {
        throw new Error('QueryAbortedError');
      }
      return 'rows';
    },
  };

  const reads: unknown[] = [];

  const strapi = {
    db,
    config: { get: (_key: string, defaultValue?: unknown) => defaultValue },
    get(name: string) {
      if (name === 'policies') {
        return { resolve: () => [] };
      }
      if (name === 'auth') {
        return {
          // Like the admin auth strategy: reads the session before any controller runs
          async authenticate(_ctx: unknown, next: () => unknown) {
            reads.push(await db.select());
            return next();
          },
          verify: async () => undefined,
        };
      }
      return undefined;
    },
    log: { error: () => undefined },
  } as any;

  return { strapi, storage, reads };
};

const dispatch = async (strapi: any, storage: any, config: Record<string, unknown> | undefined) => {
  const router = new Router();
  const handler = vi.fn(async () => 'ok');

  composeEndpoint(strapi)({ method: 'POST', path: '/logout', handler, config } as any, { router });

  const layer = router.stack[0];
  const controller = new AbortController();
  controller.abort();
  const ctx: any = { state: {}, request: {}, params: {}, set() {} };

  const run = () => layer.stack[layer.stack.length - 1](ctx, async () => undefined);
  const result = strapi.db.runWithAbortSignal(controller.signal, run);

  return { result, handler, storage };
};

describe('route config abortReadsOnRequestDisconnect', () => {
  test('refuses the reads of the auth step after a disconnect by default', async () => {
    const { strapi, storage } = createStrapi();

    const { result } = await dispatch(strapi, storage, undefined);

    await expect(result).rejects.toThrow('QueryAbortedError');
  });

  test('does not refuse the reads of the auth step when the route opts out', async () => {
    const { strapi, storage, reads } = createStrapi();

    const { result, handler } = await dispatch(strapi, storage, {
      abortReadsOnRequestDisconnect: false,
    });
    await result;

    expect(reads).toEqual(['rows']);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('runs the route normally when the database is unavailable', async () => {
    const { strapi } = createStrapi();
    strapi.db = undefined;

    const router = new Router();
    const handler = vi.fn(async () => 'ok');
    composeEndpoint(strapi)(
      {
        method: 'POST',
        path: '/logout',
        handler,
        config: { abortReadsOnRequestDisconnect: false },
      } as any,
      { router }
    );
    const layer = router.stack[0];
    const ctx: any = { state: {}, request: {}, params: {}, set() {} };
    await layer.stack[layer.stack.length - 1](ctx, async () => undefined);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
