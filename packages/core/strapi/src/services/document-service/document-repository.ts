import { Strapi, Common, Documents } from '@strapi/types';
import createDocumentService from '.';
import createMiddlewareManager from './middlewares';
import { loadDefaultMiddlewares } from './middlewares/defaults';

/**
 * Repository to :
 * - Access documents via actions (findMany, findOne, create, update, delete, ...)
 * - Execute middlewares on document actions
 * - Apply default parameters to document actions
 *
 * @param strapi
 * @param options.defaults - Default parameters to apply to all actions
 * @param options.parent - Parent repository, used when creating a new repository with .with()
 * @returns DocumentRepository
 *
 * @example Access documents
 * const article = strapi.documents('api::article.article').create(params)
 * const allArticles = strapi.documents('api::article.article').findMany(params)
 *
 */
export const createDocumentRepository = (
  strapi: Strapi,
  { defaults = {} }: { defaults?: any } = {}
): Documents.Repository => {
  const documents = createDocumentService({ strapi, db: strapi.db! });

  const middlewareManager = createMiddlewareManager();
  loadDefaultMiddlewares(middlewareManager);

  function create<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID
  ): Documents.RepositoryInstance<TContentTypeUID> {
    return {
      async findMany(params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'findMany', uid, params, options: {} }, ({ params }) =>
            documents.findMany(uid, params)
          )
        );
      },

      async findFirst(params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'findFirst', uid, params, options: {} }, ({ params }) =>
            documents.findFirst(uid, params)
          )
        );
      },

      async findOne(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'findOne', uid, params, options: { id } }, ({ params }) =>
            documents.findOne(uid, id, params)
          )
        );
      },

      async delete(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'delete', uid, params, options: { id } }, ({ params }) =>
            documents.delete(uid, id, params)
          )
        );
      },

      async deleteMany(params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'deleteMany', uid, params, options: {} }, ({ params }) =>
            documents.deleteMany(uid, params)
          )
        );
      },

      async create(params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'create', uid, params, options: {} }, ({ params }) =>
            documents.create(uid, params)
          )
        );
      },

      async clone(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'clone', uid, params, options: { id } }, ({ params }) =>
            documents.clone(uid, id, params)
          )
        );
      },

      async update(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'update', uid, params, options: { id } }, ({ params }) =>
            documents.update(uid, id, params)
          )
        );
      },

      async count(params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'count', uid, params, options: {} }, ({ params }) =>
            documents.count(uid, params)
          )
        );
      },

      async publish(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run({ action: 'publish', uid, params, options: { id } }, ({ params }) =>
            documents.publish(uid, id, params)
          )
        );
      },

      async unpublish(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run(
            { action: 'unpublish', uid, params, options: { id } },
            ({ params }) => documents.unpublish(uid, id, params)
          )
        );
      },

      async discardDraft(id: string, params = {} as any) {
        return strapi.db?.transaction?.(async () =>
          middlewareManager.run(
            { action: 'discardDraft', uid, params, options: { id } },
            ({ params }) => documents.discardDraft(uid, id, params)
          )
        );
      },

      // @ts-expect-error - TODO: Fix this
      with(params: object) {
        return createDocumentRepository(strapi, {
          defaults: { ...defaults, ...params },
        })(uid);
      },

      use(action, cb, opts) {
        middlewareManager.add(uid, action, cb, opts);
        return this;
      },
    };
  }

  Object.assign(create, {
    use(action: any, cb: any, opts?: any) {
      middlewareManager.add('_all', action, cb, opts);
      return create;
    },
    middlewares: middlewareManager,
    // NOTE : We should do this in a different way, where lifecycles are executed for the different methods
    ...documents,
  });

  // @ts-expect-error - TODO: Fix this
  return create;
};
