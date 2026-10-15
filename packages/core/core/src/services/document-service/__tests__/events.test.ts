import { createEventManager } from '../events';

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

  const setup = (findOne: jest.Mock) => {
    const commitCallbacks: Array<() => unknown> = [];
    const strapi = {
      getModel: jest.fn(() => ({ uid, modelName: 'article' })),
      db: {
        query: jest.fn(() => ({ findOne })),
        transaction: jest.fn((run: (ctx: { onCommit: (fn: () => unknown) => void }) => void) =>
          run({ onCommit: (fn) => commitCallbacks.push(fn) })
        ),
      },
      eventHub: { emit: jest.fn() },
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
});
