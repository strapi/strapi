import { describe, it, expect, vi, type Mock } from 'vitest';
import { createEventManager } from '../events';

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
