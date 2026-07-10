// Augmentation. Keep in entry point.
// On build:types, nested imports may be removed from d.ts files because they are runtime only.
// This works for Strapi consumers that use `@strapi/strapi`.
// For Strapi consumers that use `@strapi/types` won't work.
// Within workspaces tsconfig.json takes care of this.
import 'koa-body';

import * as qs from 'qs';
import type { Core } from '@strapi/types';

import Strapi, { type StrapiOptions } from './Strapi';
import { destroyOnSignal, resolveWorkingDirectories, createUpdateNotifier } from './utils';
import type {
  ContextDelegatedResponseErrorMethods,
  ContextDelegatedResponseSuccessMethods,
} from './services/server/koa-methods';

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

  interface DefaultContextDelegatedResponse
    extends ContextDelegatedResponseErrorMethods,
      ContextDelegatedResponseSuccessMethods {}
}
