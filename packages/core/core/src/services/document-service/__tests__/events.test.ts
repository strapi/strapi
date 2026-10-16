import { createEventManager } from '../events';
import { getDeepPopulate } from '../utils/populate';

jest.mock('../utils/populate', () => ({
  getDeepPopulate: jest.fn(() => ({})),
}));

jest.mock('@strapi/utils', () => ({
  sanitize: {
    sanitizers: {
      defaultSanitizeOutput: jest.fn(async () => ({ id: 1 })),
    },
  },
}));

/**
 * Jest's vm `process` does not receive `unhandledRejection`. The Node process
 * outside the vm is jest-circus `parentProcess`, which is what a discarded
 * promise rejects on. `@strapi/database` commit runs `forEach((cb) => cb())`
 * and drops the return value, so the test must do the same.
 */
const realProcess = (): NodeJS.Process => {
  const stateSymbol = Object.getOwnPropertySymbols(global).find((sym) =>
    String(sym).includes('JEST_STATE_SYMBOL')
  );
  const parent = stateSymbol
    ? (global as unknown as Record<symbol, { parentProcess?: NodeJS.Process }>)[stateSymbol]
        ?.parentProcess
    : undefined;

  return parent ?? process;
};

const discardCommitCallbacks = async (callbacks: Array<() => unknown>) => {
  const rejections: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    rejections.push(reason);
  };
  const rejectionProcess = realProcess();
  rejectionProcess.on('unhandledRejection', onUnhandled);

  try {
    callbacks.forEach((cb) => {
      cb();
    });

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    return rejections;
  } finally {
    rejectionProcess.off('unhandledRejection', onUnhandled);
  }
};

describe('createEventManager', () => {
  const uid = 'api::article.article';

  const setup = (findOne: jest.Mock, config: Record<string, unknown> = {}) => {
    const commitCallbacks: Array<() => unknown> = [];
    const strapi = {
      getModel: jest.fn(() => ({ uid, modelName: 'article' })),
      config: {
        get: jest.fn((key: string, defaultValue: unknown) =>
          key in config ? config[key] : defaultValue
        ),
      },
      db: {
        query: jest.fn(() => ({ findOne })),
        transaction: jest.fn((run: (ctx: { onCommit: (fn: () => unknown) => void }) => void) =>
          run({ onCommit: (fn) => commitCallbacks.push(fn) })
        ),
      },
      eventHub: { emit: jest.fn(), hasListeners: jest.fn(() => true) },
      log: { error: jest.fn() },
    };

    return { strapi, commitCallbacks };
  };

  it('logs and does not reject when the discarded post-commit re-read fails', async () => {
    const error = new Error('aborted');
    const { strapi, commitCallbacks } = setup(jest.fn().mockRejectedValue(error));

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
    const { strapi, commitCallbacks } = setup(jest.fn());
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
    const { strapi, commitCallbacks } = setup(jest.fn().mockResolvedValue(populated));

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
    const findOne = jest.fn().mockResolvedValue({ id: 1 });
    const { strapi, commitCallbacks } = setup(findOne);
    strapi.eventHub.hasListeners.mockReturnValue(false);

    createEventManager(strapi as any, uid).emitEvent('entry.update', { id: 1 } as any);
    const rejections = await discardCommitCallbacks(commitCallbacks);

    expect(rejections).toEqual([]);
    expect(findOne).not.toHaveBeenCalled();
    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
    expect(strapi.log.error).not.toHaveBeenCalled();
  });

  it('populates relations by default', () => {
    const { strapi } = setup(jest.fn());
    (getDeepPopulate as jest.Mock).mockClear();

    createEventManager(strapi as any, uid);

    expect(getDeepPopulate).toHaveBeenCalledWith(uid, {});
  });

  it('leaves relations out of the populate when server.webhooks.populateRelations is false', () => {
    const { strapi } = setup(jest.fn(), { 'server.webhooks.populateRelations': false });
    (getDeepPopulate as jest.Mock).mockClear();

    createEventManager(strapi as any, uid);

    expect(getDeepPopulate).toHaveBeenCalledWith(uid, { relations: false });
  });
});
