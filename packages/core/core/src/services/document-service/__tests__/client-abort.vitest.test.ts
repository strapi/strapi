import { describe, it, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { createDetachWritesMiddleware } from '../client-abort';
import { createMiddlewareManager } from '../middlewares/middleware-manager';

const WRITE_ACTIONS = [
  'create',
  'update',
  'delete',
  'clone',
  'publish',
  'unpublish',
  'discardDraft',
];
const READ_ACTIONS = ['findMany', 'findFirst', 'findOne', 'count'];

const createStrapi = (settingOn = true) => {
  // Whether the code that runs is inside runWithoutAbortSignal
  let detached = false;
  const strapi = {
    db: {
      config: { settings: { abortReadsOnRequestDisconnect: settingOn } },
      runWithoutAbortSignal: vi.fn(async (cb: () => Promise<unknown>) => {
        detached = true;
        try {
          return await cb();
        } finally {
          detached = false;
        }
      }),
    },
  } as unknown as Core.Strapi;

  return { strapi, isDetached: () => detached };
};

/** A document service like the real one: the detach middleware first, then the app's middlewares */
const createService = (strapi: Core.Strapi, isDetached: () => boolean) => {
  const manager = createMiddlewareManager();
  manager.use(createDetachWritesMiddleware(strapi));

  const seen: Record<string, { middleware: boolean; action: boolean }> = {};
  let middlewareDetached = false;
  manager.use(async (_ctx, next) => {
    middlewareDetached = isDetached();
    return next();
  });

  const repository = Object.fromEntries(
    [...WRITE_ACTIONS, ...READ_ACTIONS].map((action) => [
      action,
      async (params: unknown) => {
        seen[action] = { middleware: middlewareDetached, action: isDetached() };
        return { action, params };
      },
    ])
  );

  return { service: manager.wrapObject(repository) as Record<string, any>, seen };
};

describe('createDetachWritesMiddleware', () => {
  it.each(WRITE_ACTIONS)(
    'runs %s and the middlewares after it detached from the abort signal, with its params and result',
    async (action) => {
      const { strapi, isDetached } = createStrapi();
      const { service, seen } = createService(strapi, isDetached);

      await expect(service[action]({ documentId: 'a' })).resolves.toEqual({
        action,
        params: { documentId: 'a' },
      });

      expect(strapi.db.runWithoutAbortSignal).toHaveBeenCalledTimes(1);
      expect(seen[action]).toEqual({ middleware: true, action: true });
    }
  );

  it.each(READ_ACTIONS)('leaves %s under the abort signal', async (action) => {
    const { strapi, isDetached } = createStrapi();
    const { service, seen } = createService(strapi, isDetached);

    await service[action]({});

    expect(strapi.db.runWithoutAbortSignal).not.toHaveBeenCalled();
    expect(seen[action]).toEqual({ middleware: false, action: false });
  });

  it('only calls next while the setting is off', async () => {
    const { strapi, isDetached } = createStrapi(false);
    const { service, seen } = createService(strapi, isDetached);

    await expect(service.create({ data: {} })).resolves.toEqual({
      action: 'create',
      params: { data: {} },
    });

    expect(strapi.db.runWithoutAbortSignal).not.toHaveBeenCalled();
    expect(seen.create).toEqual({ middleware: false, action: false });
  });

  it('does not touch the database for a read', async () => {
    const strapi = {} as Core.Strapi;
    Object.defineProperty(strapi, 'db', {
      get() {
        throw new Error('the database must not be resolved');
      },
    });
    const next = vi.fn(async () => 'rows');

    await expect(createDetachWritesMiddleware(strapi)({ action: 'findMany' }, next)).resolves.toBe(
      'rows'
    );
  });
});
