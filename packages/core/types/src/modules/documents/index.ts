import type { Schema, Documents, Common } from '../..';
import type * as Middleware from './middleware';
import type { ServiceInstance } from './service-instance';

export * as Middleware from './middleware';
export * as Params from './params';
export * from './plugin';
export * from './result';
export * from './service-instance';

export type ID = string;

type ServiceUtils = {
  transformParamsDocumentId: (
    uid: Common.UID.Schema,
    query: Documents.Params.All
  ) => Promise<Documents.Params.All>;
};

export type Service = {
  (uid: Schema.ContentType['uid']): ServiceInstance;
  utils: ServiceUtils;
  /** Add a middleware for all uid's and a specific action
   *  @example - Add a default locale
   *  strapi.documents.use('findMany', (ctx, next) => {
   *    if (!params.locale) params.locale = 'en'
   *    return next(ctx)
   *  })
   */
  use: (cb: Middleware.Middleware) => Service;
};
