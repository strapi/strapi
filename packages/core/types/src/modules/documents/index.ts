import type { UID } from '../..';
import type * as Middleware from './middleware';
import type { ServiceInstance } from './service-instance';
import type { AnyDocument } from './result';
import type { ComponentExtension } from './component-extension';
import type { IsStrict } from '../../core/strictness';

export * as Middleware from './middleware';
export * as Params from './params';
export * from './plugin';
export * from './result';
export * from './service-instance';

export type ID = string;

type ServiceUtils = {
  transformData: (data: any, opts: any) => Promise<AnyDocument>;
};

export type Service = {
  <TContentTypeUID extends UID.ContentType>(
    uid: TContentTypeUID
  ): ServiceInstance<TContentTypeUID> & ComponentExtension<TContentTypeUID>;

  utils: ServiceUtils;

  /** Add a middleware for all uid's and a specific action
   *  @example - Add a default locale
   *  strapi.documents.use((ctx, next) => {
   *    if (!params.locale) params.locale = 'en'
   *    return next()
   *  })
   *
   * Returns a function that removes the middleware. With strict types disabled, the declared return
   * type stays `Service`, as on develop, although runtime does not return the service.
   */
  use: (cb: Middleware.Middleware) => IsStrict extends false ? Service : RemoveMiddleware;
};

/** Removes a document service middleware added with `strapi.documents.use()`. */
export type RemoveMiddleware = () => void;
