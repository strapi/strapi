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

/**
 * The options `strapi.documents.utils.transformData` reads: the schema of the data, and the source
 * locale and status its relations resolve against.
 */
export type TransformDataOptions = {
  uid: UID.Schema;
  locale?: string | null;
  status?: 'draft' | 'published';
  /** Drops a relation to a missing document instead of throwing. */
  allowMissingId?: boolean;
  /** Reuses the document ids loaded earlier in the same request. Defaults to `true`. */
  useRequestCache?: boolean;
};

type ServiceUtils = {
  /**
   * Replaces the relation document ids of `data` with entry ids. With strict types, it resolves to
   * the data, whose values are `unknown`: it holds no `documentId` or `id` the caller did not give.
   * Without strict types, the data and options are `any` and the result is `AnyDocument`, as on
   * develop.
   */
  transformData: (
    data: IsStrict extends false ? any : Record<string, unknown>,
    opts: IsStrict extends false ? any : TransformDataOptions
  ) => Promise<IsStrict extends false ? AnyDocument : Record<string, unknown>>;
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
