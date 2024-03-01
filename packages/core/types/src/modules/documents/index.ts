import type * as UID from '../../uid';
import type * as Middleware from './middleware';
import type { ServiceInstance } from './service-instance';

export { ID, DocumentEngine as Engine } from './document-engine';
export * as Middleware from './middleware';
export * as Params from './params';
export * from './plugin';
export * from './result';
export * from './service-instance';

export type Service = {
  <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID): ServiceInstance<TContentTypeUID>;

  /** Add a middleware for all uid's and a specific action
   *  @example - Add a default locale
   *  strapi.documents.use('findMany', (ctx, next) => {
   *    if (!params.locale) params.locale = 'en'
   *    return next(ctx)
   *  })
   */
  use: (cb: Middleware.Middleware) => Service;
};
