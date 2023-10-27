import { Strapi, Common, Documents } from '@strapi/types';
import createDocumentService from '.';
import createMiddlewareManager from './middlewares';

/**
 * TODO:
 *  - Transactions
 *  - _executeMiddlewares
 *
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

  function create<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID
  ): Documents.RepositoryInstance<TContentTypeUID> {
    return {
      async findOne(id, params = {}) {
        return middlewareManager.run(
          {
            action: 'findOne',
            uid,
            params,
            options: { id },
          },
          ({ params }) => documents.findOne(uid, id, params)
        );
      },

      async findMany(params = {}) {
        return middlewareManager.run(
          {
            action: 'findMany',
            uid,
            params,
            options: {},
          },
          ({ params }) => documents.findMany(uid, params)
        );
      },

      // async create(params = {} as any) {
      //   return documents.create(uid, params);
      // },

      with(params: object) {
        return createDocumentRepository(strapi, {
          defaults: { ...defaults, ...params },
        })(uid);
      },

      use(action, cb) {
        middlewareManager.add(uid, action, cb);
        return this;
      },
    };
  }

  Object.assign(create, {
    use(action: any, cb: any) {
      middlewareManager.add('allUIDs', action, cb);
      return create;
    },
    // NOTE : We should do this in a different way, where lifecycles are executed for the different methods
    ...documents,
  });

  // @ts-expect-error - TODO: Fix this
  return create;
};
