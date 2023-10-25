import { Strapi, Common, DocumentService } from '@strapi/types';
import createDocumentService from '.';

/**
 *
 * NOTE: Prisma did deprecate middlewares in favor of query extensions
 *        https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions/query
 *        Just in case we want to take a look!, the format is quite nice and more expressive imo.
 *        const prisma = new PrismaClient().$extends({
              query: {
                user: {
                  async findMany({ model, operation, args, query }) {
                    // take incoming `where` and set `age`
                    args.where = { ...args.where, age: { gt: 18 } }
                    return query(args)
                  },
                },
              },
            })
 */

type DocumentRepositoryInstance = {
  findMany(params?: any): Promise<any>;
  findPage(params?: any): Promise<any>;
  findFirst(params?: any): Promise<any>;
  findOne(documentId: any, params?: any): Promise<any>;
  create(params: any): Promise<any>;
  delete(documentId: any, params: any): Promise<any>;
  deleteMany(params: any): Promise<any>;
  clone(documentId: any, params: any): Promise<any>;
  publish(documentId: any, params: any): Promise<any>;
  unpublish(documentId: any, params: any): Promise<any>;
  with(params: object): any;
};

type DocumentRepository = {
  <TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID
  ): DocumentRepositoryInstance;
  use: <TAction extends keyof DocumentService.DocumentService>(
    action: TAction,
    // QUESTION: How do we type the result type of next?
    //           Should we send params + document id attribute?
    cb: (ctx: MiddlewareContext, next: any) => ReturnType<DocumentService.DocumentService[TAction]>
  ) => DocumentRepository;
} & DocumentService.DocumentService;

interface MiddlewareContext {
  uid: Common.UID.ContentType;
  action: keyof DocumentService.DocumentService;
  params: object;
  options: object;
  trx: any;
}
/**
 *
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
 * @example Add default values to your document service
 *  // `.with()` instantiates a new document service
 *  // with the given default values
 *  const enDocs = strapi.documents.with({ locales: ['en']})
 *  const frDocs = strapi.documents.with({ locales: ['fr']})
 *
 *  // Sanitize documents
 *  const sanitizedDocs = strapi.documents.with({ auth })
 *
 *  const enArticles = enDocs('api::article.article').findMany(params)
 *  const frArticles = frDocs('api::article.article').findMany(params)
 *
 * @example Add middlewares to your document service
 *
 *  // Add a middleware for all uids
 *  strapi.documents.use('findMany', (ctx, next) => {
 *    // Add default locale
 *    if (!params.locale) params.locale = 'en'
 *    return next(ctx)
 *  })
 *
 *  // Middleware for specific uid
 *  strapi.documents.use('api::article.article', async (ctx, next) => {
 *    // Filter private fields
 *    const { privateField, ...result } = await next(ctx)
 *    return result;
 *  })
 *
 */
export const createDocumentRepository = (
  strapi: Strapi,
  { defaults = {}, parent }: { defaults?: any; parent?: DocumentRepository } = {}
): DocumentRepository => {
  const middlewares = {
    // Applies to all uids
    global: [],
  } as Record<string, any>;
  const documents = createDocumentService({ strapi, db: strapi.db });

  // QUESTION: Can we do this in another way
  const repository = this;

  function create<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID
  ): DocumentRepositoryInstance {
    return {
      // @ts-expect-error - Method is not typed to avoid confusing the user
      async _executeMiddlewares(params: any, cb: any) {
        if (parent) {
          // @ts-expect-error - Method is not typed to avoid confusing the user
          await parent._executeMiddlewares(params, cb);
        }
        // Execute lifecycle callbacks
        // return next()
      },
      async findOne(params = {} as any) {
        // Execute lifecycle callbacks
        // @ts-expect-error - Method is not typed to avoid confusing the user
        return this._executeMiddlewares(params, (params) => documents.findOne(uid, params));
      },

      async findMany(params = {} as any) {
        // Execute lifecycle callbacks
        return documents.findMany(uid, params);
      },

      async create(params: any) {
        return documents.create(uid, params);
      },

      with(params: object) {
        //  We need to pass the default values too
        // { defaults: { ...defaults, ...params } } looks nice cheff-kiss

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
