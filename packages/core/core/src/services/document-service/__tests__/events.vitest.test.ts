import type { ParameterizedContext } from 'koa';
import type { Core } from '@strapi/types';
import { sanitize } from '@strapi/utils';

import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createEventManager } from '../events';
import requestContext from '../../request-context';
import createEventHub from '../../event-hub';

vi.mock('../utils/populate', () => ({
  getDeepPopulate: vi.fn(() => ({})),
}));

vi.mock('@strapi/utils', () => ({
  sanitize: {
    sanitizers: {
      defaultSanitizeOutput: vi.fn(async () => ({ id: 1 })),
    },
  },
}));

/**
 * `@strapi/database` commit runs `forEach((cb) => cb())` and drops the return
 * value, so the test must do the same. Vitest runs the test in the worker
 * process itself, which is the one a discarded promise rejects on.
 */
const discardCommitCallbacks = async (callbacks: Array<() => unknown>) => {
  const rejections: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    rejections.push(reason);
  };
  process.on('unhandledRejection', onUnhandled);

  try {
    callbacks.forEach((cb) => {
      cb();
    });

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    return rejections;
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
};

describe('createEventManager', () => {
  const uid = 'api::article.article';

  const setup = (findOne: Mock) => {
    const commitCallbacks: Array<() => unknown> = [];
    const strapi = {
      config: { get: vi.fn() },
      getModel: vi.fn(() => ({ uid, modelName: 'article' })),
      db: {
        query: vi.fn(() => ({ findOne })),
        transaction: vi.fn((run: (ctx: { onCommit: (fn: () => unknown) => void }) => void) =>
          run({ onCommit: (fn) => commitCallbacks.push(fn) })
        ),
      },
      eventHub: { emit: vi.fn(), hasListeners: vi.fn(() => true) },
      log: { error: vi.fn() },
    };

    return { strapi, commitCallbacks };
  };

  it('logs and does not reject when the discarded post-commit re-read fails', async () => {
    const error = new Error('aborted');
    const { strapi, commitCallbacks } = setup(vi.fn().mockRejectedValue(error));

    createEventManager(strapi as any, uid).emitEvent('entry.create', { id: 1 } as any);

    expect(commitCallbacks).toHaveLength(1);

    const rejections = await discardCommitCallbacks(commitCallbacks);

    expect(rejections).toEqual([]);
    expect(strapi.log.error).toHaveBeenCalledTimes(1);
    expect(strapi.log.error).toHaveBeenCalledWith(
      `Could not emit entry.create for ${uid}: aborted`
    );
    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });

  it('logs and does not reject when the discarded event-hub emit fails', async () => {
    const { strapi, commitCallbacks } = setup(vi.fn());
    strapi.eventHub.emit.mockRejectedValue(new Error('hub down'));

    createEventManager(strapi as any, uid).emitEvent('entry.delete', { id: 1 } as any);

    const rejections = await discardCommitCallbacks(commitCallbacks);

    expect(strapi.eventHub.emit).toHaveBeenCalledTimes(1);
    expect(strapi.eventHub.emit).toHaveBeenCalledWith(
      'entry.delete',
      expect.objectContaining({
        uid,
        entry: { id: 1 },
      })
    );
    expect(rejections).toEqual([]);
    expect(strapi.log.error).toHaveBeenCalledTimes(1);
    expect(strapi.log.error).toHaveBeenCalledWith(
      `Could not emit entry.delete for ${uid}: hub down`
    );
  });

  it('reads the entry again with the deep populate and emits it when something listens', async () => {
    const populated = { id: 1, title: 'Populated' };
    const { strapi, commitCallbacks } = setup(vi.fn().mockResolvedValue(populated));

    createEventManager(strapi as any, uid).emitEvent('entry.update', { id: 1 } as any);
    await discardCommitCallbacks(commitCallbacks);

    expect(strapi.eventHub.hasListeners).toHaveBeenCalledWith('entry.update');
    expect(strapi.db.query).toHaveBeenCalledWith(uid);
    expect(strapi.db.query(uid).findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: {} });
    expect(strapi.eventHub.emit).toHaveBeenCalledWith('entry.update', {
      model: 'article',
      uid,
      entry: { id: 1 },
    });
  });

  it('neither reads the entry again nor emits when nothing listens to the event', async () => {
    const findOne = vi.fn().mockResolvedValue({ id: 1 });
    const { strapi, commitCallbacks } = setup(findOne);
    strapi.eventHub.hasListeners.mockReturnValue(false);

    createEventManager(strapi as any, uid).emitEvent('entry.update', { id: 1 } as any);
    const rejections = await discardCommitCallbacks(commitCallbacks);

    expect(rejections).toEqual([]);
    expect(findOne).not.toHaveBeenCalled();
    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
    expect(strapi.log.error).not.toHaveBeenCalled();
  });
});

describe('Document events', () => {
  const uid = 'api::article.article';
  const entry = { id: 1, documentId: 'article' };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createEventManagerMock = (
    configuration: { deduplicateReleaseWebhooks?: boolean } = { deduplicateReleaseWebhooks: true }
  ) => {
    const commitCallbacks: (() => Promise<void>)[] = [];
    const eventHub = createEventHub();
    const strapi = {
      config: { get: vi.fn(() => configuration.deduplicateReleaseWebhooks) },
      requestContext,
      eventHub,
      getModel: vi.fn(() => ({ uid, modelName: 'article' })),
      db: {
        query: vi.fn(() => ({ findOne: vi.fn().mockResolvedValue(entry) })),
        transaction: vi.fn(
          (work: (context: { onCommit: (callback: () => Promise<void>) => void }) => void) =>
            work({ onCommit: (callback) => commitCallbacks.push(callback) })
        ),
      },
    } as unknown as Core.Strapi;

    vi.spyOn(sanitize.sanitizers, 'defaultSanitizeOutput').mockResolvedValue(entry);

    return { eventHub, commitCallbacks, eventManager: createEventManager(strapi, uid) };
  };

  it.each([{}, { deduplicateReleaseWebhooks: false }])(
    'skips context tracking with configuration=%j',
    async (configuration) => {
      const { eventHub, commitCallbacks, eventManager } = createEventManagerMock(configuration);
      const getContext = vi.spyOn(requestContext, 'get');
      const runContext = vi.spyOn(requestContext, 'run');
      const listener = vi.fn();

      eventHub.on('entry.publish', listener);
      eventManager.emitEvent('entry.publish', entry);

      expect(listener).not.toHaveBeenCalled();

      await commitCallbacks[0]();

      expect(listener).toHaveBeenCalledWith({ model: 'article', uid, entry });
      expect(getContext).not.toHaveBeenCalled();
      expect(runContext).not.toHaveBeenCalled();
    }
  );

  it.each(['entry.publish', 'entry.unpublish'])(
    'preserves release context for %s after its operation scope ends',
    async (event) => {
      const { eventHub, commitCallbacks, eventManager } = createEventManagerMock();
      const context = {
        state: { releaseId: 1 },
      } as ParameterizedContext;

      const listener = vi.fn(async () => {
        expect(requestContext.get()).toBe(context);
      });

      eventHub.on(event, listener);

      await requestContext.run(context, async () => {
        eventManager.emitEvent(event, entry);
      });

      expect(listener).not.toHaveBeenCalled();
      expect(requestContext.get()).toBeUndefined();

      await commitCallbacks[0]();

      expect(listener).toHaveBeenCalledWith({ model: 'article', uid, entry });
      expect(requestContext.get()).toBeUndefined();
    }
  );

  it('keeps standalone and release contexts separate when they commit together', async () => {
    const { eventHub, commitCallbacks, eventManager } = createEventManagerMock();
    const releaseIds: (number | undefined)[] = [];

    eventHub.on('entry.publish', async () => {
      releaseIds.push(requestContext.get()?.state?.releaseId);
    });

    await requestContext.run({ state: { releaseId: 1 } } as ParameterizedContext, async () => {
      eventManager.emitEvent('entry.publish', entry);
    });

    eventManager.emitEvent('entry.publish', entry);
    await Promise.all(commitCallbacks.map((commit) => commit()));

    expect(releaseIds).toEqual([1, undefined]);
    expect(requestContext.get()).toBeUndefined();
  });
});
