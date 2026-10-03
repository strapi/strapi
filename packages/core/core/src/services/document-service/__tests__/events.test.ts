import type { ParameterizedContext } from 'koa';
import type { Core } from '@strapi/types';
import { sanitize } from '@strapi/utils';

import { createEventManager } from '../events';
import requestContext from '../../request-context';
import createEventHub from '../../event-hub';

jest.mock('../utils/populate', () => ({
  getDeepPopulate: jest.fn(() => ({})),
}));

describe('Document events', () => {
  const uid = 'api::article.article';
  const entry = { id: 1, documentId: 'article' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createEventManagerMock = () => {
    const commitCallbacks: (() => Promise<void>)[] = [];
    const eventHub = createEventHub();
    const strapi = {
      requestContext,
      eventHub,
      getModel: jest.fn(() => ({ uid, modelName: 'article' })),
      db: {
        query: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(entry) })),
        transaction: jest.fn(
          (work: (context: { onCommit: (callback: () => Promise<void>) => void }) => void) =>
            work({ onCommit: (callback) => commitCallbacks.push(callback) })
        ),
      },
    } as unknown as Core.Strapi;

    jest.spyOn(sanitize.sanitizers, 'defaultSanitizeOutput').mockResolvedValue(entry);

    return { eventHub, commitCallbacks, eventManager: createEventManager(strapi, uid) };
  };

  it.each(['entry.publish', 'entry.unpublish'])(
    'preserves release context for %s after its operation scope ends',
    async (event) => {
      const { eventHub, commitCallbacks, eventManager } = createEventManagerMock();
      const context = {
        state: { releaseId: 1 },
      } as ParameterizedContext;

      const listener = jest.fn(async () => {
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
