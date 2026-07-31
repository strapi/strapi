import * as qs from 'qs';
import type { Core, Modules } from '@strapi/types';

import Strapi, { type StrapiOptions } from './Strapi';
import { destroyOnSignal, resolveWorkingDirectories, createUpdateNotifier } from './utils';

export { default as compileStrapi } from './compile';
export * as factories from './factories';
export * as ai from './ai';

export const createStrapi = (options: Partial<StrapiOptions> = {}): Core.Strapi => {
  const strapi = new Strapi({
    ...options,
    ...resolveWorkingDirectories(options),
  });

  destroyOnSignal(strapi);
  createUpdateNotifier(strapi);

  // TODO: deprecate and remove in next major
  global.strapi = strapi;

  return strapi;
};

// Augment Koa query type based on Strapi query middleware

declare module 'koa' {
  type ParsedQuery = ReturnType<typeof qs.parse>;

  export interface BaseRequest {
    _querycache?: ParsedQuery;

    get query(): ParsedQuery;
    set query(obj: any);
  }

  export interface BaseContext {
    _querycache?: ParsedQuery;

    get query(): ParsedQuery;
    set query(obj: any);
  }

  // Documents the field's shape; Koa's DefaultState is `any`-based, so this is
  // intent, not a compile-time guard. The union is enforced where it's read.
  interface DefaultState {
    auditSource?: Modules.AuditLogs.AuditSource;
  }
}
