import type { Schema } from '../..';
import type * as Middleware from './middleware';
import type { ServiceInstance } from './service-instance';

export { ID, DocumentEngine as Engine } from './document-engine';
export * as Middleware from './middleware';
export * as Params from './params';
export * from './plugin';
export * from './result';
export * from './service-instance';

export type Service = {
  (uid: Schema.CollectionType['uid']): ServiceInstance<Schema.CollectionType>;

  /** Add a middleware for all uid's and a specific action
   *  @example - Add a default locale
   *  strapi.documents.use('findMany', (ctx, next) => {
   *    if (!params.locale) params.locale = 'en'
   *    return next(ctx)
   *  })
   */
  use: (cb: Middleware.Middleware) => Service;
  singleType: (uid: Schema.SingleType['uid']) => ServiceInstance<Schema.SingleType>;
  collectionType: (uid: Schema.CollectionType['uid']) => ServiceInstance<Schema.CollectionType>;
};
