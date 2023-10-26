import { Strapi, Common, Documents } from '@strapi/types';
import createDocumentService from '.';

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
  { defaults = {}, parent }: { defaults?: any; parent?: Documents.Repository } = {}
): Documents.Repository => {
  const middlewares = {
    // Applies to all uid's
    global: [],
  } as Record<string, any>;
  const documents = createDocumentService({ strapi, db: strapi.db! });

  // QUESTION: Can we do this in another way
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const repository = this;

  function create<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID
  ): Documents.RepositoryInstance<TContentTypeUID> {
    return {
      async runMiddlewares(ctx, cb) {
        // TODO
        // if (parent) {
        //   await parent.runMiddlewares(ctx, cb);
        // }

        // Get middlewares for the given uid
        // TODO: Add global middlewares if uid is undefined
        const contentTypeMiddlewares = middlewares[ctx.action] || [];

        // Build middleware stack and run it
        const run = contentTypeMiddlewares.reduceRight(
          (next: any, middleware: any) => (ctx: any) => middleware(ctx, next),
          cb
        );
        return run(ctx);
      },

      async findOne(id, params = {}) {
        return this.runMiddlewares(
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
        return this.runMiddlewares(
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
          parent: repository,
        })(uid);
      },
    };
  }

  Object.assign(create, {
    use(uid: any, cb: any) {
      if (!middlewares[uid]) {
        middlewares[uid] = [];
      }
      middlewares[uid].push(cb);
    },
    // NOTE : We should do this in a different way, where lifecycles are executed for the different methods
    ...documents,
  });

  // @ts-expect-error - TODO: Fix this
  return create;
};
