import * as qs from 'qs';
import type { Core } from '@strapi/types';

import Strapi, { type StrapiOptions } from './Strapi';
import { destroyOnSignal, resolveWorkingDirectories, createUpdateNotifier } from './utils';
import type { AppDefinition } from './app-definition';

export { default as compileStrapi } from './compile';
export * as factories from './factories';

export {
  defineApp,
  defineConfig,
  defineDatabaseConfig,
  defineServerConfig,
  fromDisk,
  isAppDefinition,
  isDiskSource,
} from './app-definition';
export type {
  AppDefinition,
  AppInput,
  AppContentType,
  AppConfig,
  PluginEntry,
  PluginModule,
  RouteBuilder,
  DiskSource,
} from './app-definition';

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

/**
 * Options accepted by {@link startStrapi}. `app` is supplied positionally.
 */
export type StartStrapiOptions = Partial<Omit<StrapiOptions, 'app'>>;

/**
 * Primary Phase 1 entry point for programmatic apps. Builds a Strapi instance
 * from a `defineApp(...)` result and starts it. Defaults to headless
 * (`serveAdminPanel: false`) — the admin server module still loads, only the
 * panel is not built/served (ADR-0007, ADR-0009).
 */
export const startStrapi = async (
  app: AppDefinition,
  options: StartStrapiOptions = {}
): Promise<Core.Strapi> => {
  const strapi = createStrapi({
    serveAdminPanel: false,
    ...options,
    app,
  });

  await strapi.start();

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
}
