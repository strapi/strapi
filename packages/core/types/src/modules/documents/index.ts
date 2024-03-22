import type { Schema } from '../..';
import type * as Middleware from './middleware';
import type { ServiceInstance } from './service-instance';

export * as Middleware from './middleware';
export * as Params from './params';
export * from './plugin';
export * from './result';
export * from './service-instance';

export type ID = string;

type Data = {
  id?: number | string;
  [key: string]: string | number | boolean | null | undefined | Date | Data | Data[];
};

type ServiceUtils = {
  transformData: (data: any, opts: any) => Promise<Data>;
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
