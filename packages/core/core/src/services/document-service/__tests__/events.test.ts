import { createEventManager } from '../events';

jest.mock('../utils/populate', () => ({
  getDeepPopulate: jest.fn(() => ({})),
}));

describe('createEventManager', () => {
  const uid = 'api::article.article';

  const setup = (findOne: jest.Mock) => {
    const commitCallbacks: Array<() => unknown> = [];
    const strapi = {
      getModel: jest.fn(() => ({ uid, modelName: 'article' })),
      db: {
        query: jest.fn(() => ({ findOne })),
        transaction: jest.fn((run: any) =>
          run({ onCommit: (fn: () => unknown) => commitCallbacks.push(fn) })
        ),
      },
      eventHub: { emit: jest.fn() },
      log: { error: jest.fn() },
    } as any;

    return { strapi, commitCallbacks };
  };

  it('does not leave an unhandled rejection and logs when the post-commit re-read fails', async () => {
    const error = new Error('aborted');
    const { strapi, commitCallbacks } = setup(jest.fn().mockRejectedValue(error));

    createEventManager(strapi, uid).emitEvent('entry.create', { id: 1 } as any);

    expect(commitCallbacks).toHaveLength(1);

    // The transaction runner discards the callback result, so a rejection must be handled inside it
    await expect(Promise.resolve(commitCallbacks[0]())).resolves.toBeUndefined();

    expect(strapi.log.error).toHaveBeenCalledTimes(1);
    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });

  it('logs when emitting to the event hub fails', async () => {
    const { strapi, commitCallbacks } = setup(jest.fn().mockResolvedValue({ id: 1 }));
    strapi.eventHub.emit.mockRejectedValue(new Error('hub down'));

    createEventManager(strapi, uid).emitEvent('entry.delete', { id: 1 } as any);

    await expect(Promise.resolve(commitCallbacks[0]())).resolves.toBeUndefined();

    expect(strapi.log.error).toHaveBeenCalledTimes(1);
  });
});
