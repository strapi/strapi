import type { Core, Modules, Schema } from '@strapi/types';
import { bootstrap } from '../../bootstrap';
import { isEntryValid } from '../../utils';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  isEntryValid: jest.fn().mockResolvedValue(true),
}));

type Middleware = Modules.Documents.Middleware.Middleware;
type Context = Modules.Documents.Middleware.Context;
type Subscriber = Exclude<
  Parameters<Core.Strapi['db']['lifecycles']['subscribe']>[0],
  (event: never) => unknown
>;

const contentType: Schema.ContentType = {
  uid: 'api::article.article',
  modelType: 'contentType',
  modelName: 'article',
  globalId: 'Article',
  kind: 'collectionType',
  collectionName: 'articles',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: { draftAndPublish: true },
  attributes: {},
};

describe('content-releases cleanup', () => {
  const error = new Error('database unavailable');
  const findMany = jest.fn();
  const deleteMany = jest.fn();
  const updateMany = jest.fn();
  const updateReleaseStatus = jest.fn();
  const logError = jest.fn();
  let middlewares: Middleware[];
  let subscriber: Subscriber;

  beforeEach(async () => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    deleteMany.mockResolvedValue({ count: 1 });
    updateMany.mockResolvedValue({ count: 1 });
    updateReleaseStatus.mockResolvedValue({});
    jest.mocked(isEntryValid).mockResolvedValue(true);
    middlewares = [];
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
      documents: { use: (middleware: Middleware) => middlewares.push(middleware) },
      plugin: () => ({
        service: (name: string) =>
          name === 'release'
            ? { updateReleaseStatus }
            : { syncFromDatabase: jest.fn().mockResolvedValue(undefined) },
      }),
      get: () => ({ addAllowedEvent: jest.fn() }),
      has: () => false,
    } as unknown as Core.Strapi;
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
      const ctx: Context = {
        action,
        uid: contentType.uid,
        contentType,
        params: { documentId: 'doc-1', locale: 'en', ...(action === 'update' && { data: {} }) },
      };
      const middleware = middlewares[action === 'delete' ? 0 : 1];
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
          status: updateReleaseStatus,
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

    it('updates every affected release on success', async () => {
      await invoke();
      expect(updateReleaseStatus.mock.calls).toEqual([[1], [2]]);
      expect(logError).not.toHaveBeenCalled();
    });
  });
});
