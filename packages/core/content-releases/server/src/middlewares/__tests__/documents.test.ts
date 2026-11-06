import { setImmediate } from 'node:timers/promises';

import type { Core, Modules, Schema } from '@strapi/types';

import { bootstrap } from '../../bootstrap';
import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { isEntryValid } from '../../utils';
import { deleteActionsOnDelete, updateActionsOnUpdate } from '../documents';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  isEntryValid: jest.fn().mockResolvedValue(true),
}));

type Middleware = Modules.Documents.Middleware.Middleware;
type Context = Parameters<Middleware>[0];
type Subscriber = Exclude<
  Parameters<Core.Strapi['db']['lifecycles']['subscribe']>[0],
  (event: never) => unknown
>;

const UID = 'api::article.article';

const releaseFindMany = jest.fn();
const actionDeleteMany = jest.fn();
const updateReleaseStatus = jest.fn();

const setupStrapi = ({ localized }: { localized: boolean }) => {
  global.strapi = {
    db: {
      query: jest.fn((uid: string) =>
        uid === RELEASE_ACTION_MODEL_UID
          ? { deleteMany: actionDeleteMany }
          : { findMany: releaseFindMany }
      ),
    },
    plugins: { 'content-releases': { services: { release: { updateReleaseStatus } } } },
    localization: {
      isLocalizedContentType: () => localized,
      getDefaultLocale: jest.fn().mockResolvedValue('en'),
    },
    log: { error: jest.fn() },
  } as unknown as typeof global.strapi;
};

const deleteDocument = async (params: Record<string, unknown>, { draftAndPublish = true } = {}) => {
  const next = jest.fn().mockResolvedValue({ documentId: 'doc-1', entries: [] });
  const ctx = {
    action: 'delete',
    contentType: { uid: UID, options: { draftAndPublish } },
    params: { documentId: 'doc-1', ...params },
  } as unknown as Context;

  await deleteActionsOnDelete(ctx, next);
  await setImmediate();

  return next;
};

describe('deleteActionsOnDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    releaseFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  });

  it.each([
    ['a non-localized entry, without a locale', false, {}, {}],
    ['a non-localized entry, whatever the locale passed', false, { locale: 'en' }, {}],
    ['one locale of a localized entry', true, { locale: 'fr' }, { locale: 'fr' }],
    ['every locale of a localized entry', true, { locale: '*' }, {}],
    [
      'some locales of a localized entry',
      true,
      { locale: ['en', 'fr'] },
      { locale: { $in: ['en', 'fr'] } },
    ],
    ['a localized entry without a locale', true, {}, { locale: 'en' }],
  ])('removes the release actions of %s', async (_, localized, params, localeFilter) => {
    setupStrapi({ localized });

    await deleteDocument(params);

    const where = { contentType: UID, entryDocumentId: 'doc-1', ...localeFilter };
    expect(releaseFindMany.mock.calls).toStrictEqual([
      [{ where: { releasedAt: null, actions: where } }],
    ]);
    expect(actionDeleteMany.mock.calls).toStrictEqual([
      [{ where: { ...where, release: { releasedAt: null } } }],
    ]);
    expect(updateReleaseStatus).toHaveBeenCalledWith(1);
    expect(updateReleaseStatus).toHaveBeenCalledWith(2);
  });

  it('never looks up nor deletes the actions of a released release', async () => {
    setupStrapi({ localized: false });

    await deleteDocument({});

    const [[{ where: releaseWhere }]] = releaseFindMany.mock.calls;
    const [[{ where: actionWhere }]] = actionDeleteMany.mock.calls;
    expect(releaseWhere.releasedAt).toBeNull();
    expect(actionWhere.release).toStrictEqual({ releasedAt: null });
  });

  it('leaves releases alone for a content type without draft and publish', async () => {
    setupStrapi({ localized: false });

    const next = await deleteDocument({}, { draftAndPublish: false });

    expect(next).toHaveBeenCalled();
    expect(actionDeleteMany).not.toHaveBeenCalled();
  });
});

const contentType: Schema.ContentType = {
  uid: UID,
  modelType: 'contentType',
  modelName: 'article',
  globalId: 'Article',
  kind: 'collectionType',
  collectionName: 'articles',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: { draftAndPublish: true },
  attributes: {},
};

describe('content-releases cleanup failures', () => {
  const error = new Error('database unavailable');
  const findMany = jest.fn();
  const deleteMany = jest.fn();
  const updateMany = jest.fn();
  const updateStatus = jest.fn();
  const logError = jest.fn();
  let deleteMiddleware: Middleware;
  let updateMiddleware: Middleware;
  let subscriber: Subscriber;

  beforeEach(async () => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    deleteMany.mockResolvedValue({ count: 1 });
    updateMany.mockResolvedValue({ count: 1 });
    updateStatus.mockResolvedValue({});
    jest.mocked(isEntryValid).mockResolvedValue(true);

    const strapi = {
      db: {
        query: jest.fn(() => ({ findMany, deleteMany, updateMany })),
        lifecycles: {
          subscribe(value: Subscriber) {
            subscriber = value;
          },
        },
      },
      log: { error: logError },
      ee: { features: { isEnabled: () => true } },
      contentTypes: { [contentType.uid]: contentType },
      getModel: () => contentType,
      documents: {
        use(middleware: Middleware) {
          if (middleware === deleteActionsOnDelete) {
            deleteMiddleware = middleware;
          }
          if (middleware === updateActionsOnUpdate) {
            updateMiddleware = middleware;
          }
        },
      },
      plugins: {
        'content-releases': {
          services: {
            release: { updateReleaseStatus: updateStatus },
            scheduling: { syncFromDatabase: jest.fn().mockResolvedValue(undefined) },
          },
        },
      },
      localization: {
        isLocalizedContentType: () => false,
        getDefaultLocale: jest.fn().mockResolvedValue('en'),
      },
      get: () => ({ addAllowedEvent: jest.fn() }),
      has: () => false,
    } as unknown as Core.Strapi;

    global.strapi = strapi;
    await bootstrap({ strapi });
  });

  describe.each(['delete', 'update', 'afterDeleteMany'] as const)('%s', (action) => {
    const invoke = async () => {
      if (action === 'afterDeleteMany') {
        await subscriber.afterDeleteMany!({
          action: 'afterDeleteMany',
          model: {
            uid: contentType.uid,
            singularName: 'article',
            tableName: 'articles',
            attributes: {},
            columnToAttribute: {},
            indexes: [],
            foreignKeys: [],
            lifecycles: {},
          },
          params: { where: { locale: 'en', documentId: 'doc-1' } },
          state: {},
        });
        return;
      }

      const result = { id: 1, documentId: 'doc-1', locale: 'en' };
      const ctx = {
        action,
        uid: contentType.uid,
        contentType,
        params: { documentId: 'doc-1', locale: 'en', ...(action === 'update' && { data: {} }) },
      } as unknown as Context;
      const middleware = action === 'delete' ? deleteMiddleware : updateMiddleware;
      await expect(middleware(ctx, async () => result)).resolves.toBe(result);
    };

    it.each(['lookup', 'cleanup', 'status'] as const)(
      'logs a %s failure without blocking the operation',
      async (stage) => {
        // Keep the rejection handled even if an await regresses, so the log assertion reports it.
        const rejected = Promise.reject(error);
        rejected.catch(() => {});
        const failingCall = {
          lookup: findMany,
          status: updateStatus,
          cleanup: action === 'update' ? updateMany : deleteMany,
        }[stage];
        failingCall.mockReturnValueOnce(rejected);
        await invoke();
        const message = {
          update: 'Error while updating release actions after update',
          delete: 'Error while deleting release actions after delete',
          afterDeleteMany: 'Error while deleting release actions after entry deleteMany',
        }[action];
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith(message, { error });
      }
    );

    // The update path filters released releases in its own lookup, covered by the status tests.
    if (action !== 'update') {
      it('only touches releases that are not released yet', async () => {
        await invoke();

        const [[{ where: releaseWhere }]] = findMany.mock.calls;
        const [[{ where: actionWhere }]] = deleteMany.mock.calls;
        expect(releaseWhere.releasedAt).toBeNull();
        expect(actionWhere.release).toStrictEqual({ releasedAt: null });
      });
    }

    it('updates every affected release on success', async () => {
      await invoke();
      expect(updateStatus.mock.calls).toEqual([[1], [2]]);
      expect(logError).not.toHaveBeenCalled();
    });

    it('updates later releases when one status refresh fails', async () => {
      findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const rejected = Promise.reject(error);
      rejected.catch(() => {});
      updateStatus.mockReset();
      updateStatus
        .mockResolvedValueOnce({})
        .mockReturnValueOnce(rejected)
        .mockResolvedValueOnce({});

      await invoke();

      expect(updateStatus.mock.calls).toEqual([[1], [2], [3]]);
      const message = {
        update: 'Error while updating release actions after update',
        delete: 'Error while deleting release actions after delete',
        afterDeleteMany: 'Error while deleting release actions after entry deleteMany',
      }[action];
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(message, { error });
    });
  });
});
