import { Common } from '../..';
import { ID, DocumentService } from './document-service';
import type * as Params from './params';

export { ID } from './document-service';

// Utility type to reuse Param definition in MiddlewareContext
type ParamsMap<TContentTypeUID extends Common.UID.ContentType> = {
  findOne: Params.FindOne<TContentTypeUID>;
  findMany: Params.FindMany<TContentTypeUID>;
  findPage: Params.FindPage<TContentTypeUID>;
  findFirst: Params.FindFirst<TContentTypeUID>;
  // ...
};

export interface MiddlewareContext<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
  TAction extends keyof ParamsMap<TContentTypeUID> = keyof ParamsMap<TContentTypeUID>
> {
  uid: TContentTypeUID;
  action: TAction;
  params: ParamsMap<TContentTypeUID>[TAction];
  options: object;
  trx?: any;
}

export type Middleware<TAction extends keyof DocumentService> = (
  ctx: MiddlewareContext,
  next: (ctx: MiddlewareContext) => ReturnType<DocumentService[TAction]>
) => ReturnType<DocumentService[TAction]>;

export type RepositoryInstance<TContentTypeUID extends Common.UID.ContentType> = {
  runMiddlewares<TCtx extends MiddlewareContext<TContentTypeUID>>(
    ctx: TCtx,
    cb: (ctx: TCtx) => void
  ): Promise<any>;
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
  /**
   *  @example Add a middleware for all uid's
   *  strapi.documents.use('findMany', (ctx, next) => {
   *    // Add default locale
   *    if (!params.locale) params.locale = 'en'
   *    return next(ctx)
   *  })
   *
   *  @example Add a middleware for a specific uid
   *  strapi.documents.use('api::article.article', async (ctx, next) => {
   *    // Filter private fields
   *    const { privateField, ...result } = await next(ctx)
   *    return result;
   *  })
   */
  use: <TAction extends keyof DocumentService>(
    action: TAction,
    // QUESTION: How do we type the result type of next?
    //           Should we send params + document id attribute?
    cb: Middleware<TAction>
  ) => Repository;
} & DocumentService;
