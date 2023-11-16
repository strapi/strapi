import { Common } from '../..';
import { ID, type DocumentService } from './document-service';
import type * as Middleware from './middleware';
import type * as Params from './params/document-service';
import type * as Result from './result/document-service';

export { ID, DocumentService as Service } from './document-service';
export type * as Middleware from './middleware';
export * as Params from './params';
export * from './plugin';
export * from './result';

export type RepositoryInstance<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType
> = {
  findMany: <TParams extends Params.FindMany<TContentTypeUID>>(
    params?: TParams
  ) => Result.FindMany<TContentTypeUID, TParams>;

  findFirst: <TParams extends Params.FindFirst<TContentTypeUID>>(
    params?: TParams
  ) => Result.FindFirst<TContentTypeUID, TParams>;

  findOne: <TParams extends Params.FindOne<TContentTypeUID>>(
    id: ID,
    params?: TParams
  ) => Result.FindOne<TContentTypeUID, TParams>;

  delete: <TParams extends Params.Delete<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.Delete<TContentTypeUID, TParams>;

  deleteMany: <TParams extends Params.DeleteMany<TContentTypeUID>>(
    params: TParams
  ) => Result.DeleteMany;

  create: <TParams extends Params.Create<TContentTypeUID>>(
    params: TParams
  ) => Result.Create<TContentTypeUID, TParams>;

  clone: <TParams extends Params.Clone<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ) => Result.Clone;

  update: <TParams extends Params.Update<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ) => Result.Update<TContentTypeUID, TParams>;

  count: <TParams extends Params.Count<TContentTypeUID>>(params?: TParams) => Result.Count;

  publish: <TParams extends Params.Publish<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.Publish;

  unpublish: <TParams extends Params.Unpublish<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.Unpublish;

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
    cb:
      | Middleware.Middleware<Common.UID.ContentType, TAction>
      | Middleware.Middleware<Common.UID.ContentType, TAction>[],
    opts?: Middleware.Options
  ) => ThisType<RepositoryInstance<TContentTypeUID>>;

  /**
   * `.with()` instantiates a new document repository with default parameters
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
  with: <TParams extends Params.With<TContentTypeUID>>(
    params?: TParams
  ) => RepositoryInstance<TContentTypeUID>;
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
    cb:
      | Middleware.Middleware<Common.UID.ContentType, TAction>
      | Middleware.Middleware<Common.UID.ContentType, TAction>[],
    opts?: Middleware.Options
  ) => Repository;

  middlewares: Middleware.Manager;
} & DocumentService;
