import { Common } from '../..';
import { ID, DocumentService } from './document-service';
import type * as Params from './params';
import type * as Middleware from './middleware';

export type RepositoryInstance<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType
> = {
  findOne: (id: ID, params?: Params.FindOne<TContentTypeUID>) => any;
  findMany: (params?: any) => any;
  // findPage: (params?: any) => any;
  // findFirst: (params?: any) => any;
  // create: (params: any) => any;
  // delete: (documentId: any, params: any) => any;
  // deleteMany: (params: any) => any;
  // clone: (documentId: any, params: any) => any;
  // publish: (documentId: any, params: any) => any;
  // unpublish: OmitUid<DocumentService['unpublish']>;

  /** Add a middleware for a specific uid
   *  @example
   *  strapi.documents('api::article.article').use('findMany', async (ctx, next) => {
   *    // Filter private fields
   *    const { privateField, ...result } = await next(ctx)
   *    return result;
   *  })
   */
  use: <TAction extends keyof DocumentService>(
    action: TAction,
    // QUESTION: How do we type the result type of next?
    //           Should we send params + document id attribute?
    cb: Middleware.Middleware<TAction>
  ) => ThisType<RepositoryInstance<TContentTypeUID>>;

  /**
   * `.with()` instantiates a new document service
   * @example Add default values to your document service
   *  // with the given default values
   *  const enDocs = strapi.documents.with({ locales: ['en']})
   *  const frDocs = strapi.documents.with({ locales: ['fr']})
   *
   *  const enArticles = enDocs('api::article.article').findMany(params)
   *  const frArticles = frDocs('api::article.article').findMany(params)
   *
   * @example Apply sanitization to your document service
   * const sanitizedDocs = strapi.documents.with({ auth })
   */
  with(params: object): any;
};

export type Repository = {
  <TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID
  ): RepositoryInstance<TContentTypeUID>;

  /** Add a middleware for all uid's and a specific action
   *  @example - Add a default locale
   *  strapi.documents.use('findMany', (ctx, next) => {
   *    if (!params.locale) params.locale = 'en'
   *    return next(ctx)
   *  })
   */
  use: <TAction extends keyof DocumentService>(
    action: TAction,
    // QUESTION: How do we type the result type of next?
    //           Should we send params + document id attribute?
    cb: Middleware.Middleware<TAction>
  ) => Repository;
} & DocumentService;

export { ID } from './document-service';
export type * as Middleware from './middleware';
