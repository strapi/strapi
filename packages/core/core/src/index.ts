import path from 'node:path';
import fs from 'node:fs';
import * as qs from 'qs';
import type { Core } from '@strapi/types';

import Strapi, { type StrapiOptions } from './Strapi';
import { destroyOnSignal, resolveWorkingDirectories, createUpdateNotifier } from './utils';
import type { AppDefinition } from './app-definition';

export { default as compileStrapi } from './compile';
export * as factories from './factories';

export {
  defineApp,
  defineComponent,
  definePlugin,
  defineConfig,
  defineDatabaseConfig,
  defineServerConfig,
  fromDisk,
  isAppDefinition,
  isDiskSource,
  isDefinedPlugin,
  getAdminPluginResolutions,
} from './app-definition';
export type {
  AppDefinition,
  AppInput,
  AppContentType,
  AppComponent,
  AppConfig,
  PluginEntry,
  PluginModule,
  PluginsInput,
  DefinedPlugin,
  DefinePluginInput,
  RouteBuilder,
  DiskSource,
  AdminPluginResolution,
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
 * Whether a built admin panel exists under the resolved dist dir
 * (`<distDir>/build/index.html`). Used by {@link startStrapi} to decide whether
 * to serve the panel by default.
 */
const hasAdminBuild = (options: StartStrapiOptions): boolean => {
  const { distDir } = resolveWorkingDirectories(options);
  return fs.existsSync(path.join(distDir, 'build', 'index.html'));
};

/**
 * Primary entry point for programmatic apps. Builds a Strapi instance from a
 * `defineApp(...)` result and starts it.
 *
 * The admin **panel** is served automatically when a build exists at
 * `<distDir>/build` (produced by `buildAdmin`), and stays headless otherwise —
 * the admin server module always loads either way (ADR-0007). Pass an explicit
 * `serveAdminPanel` to override the auto-detection.
 */
export const startStrapi = async (
  app: AppDefinition,
  options: StartStrapiOptions = {}
): Promise<Core.Strapi> => {
  const strapi = createStrapi({
    // Serve the panel only when a real build is present; headless otherwise.
    serveAdminPanel: hasAdminBuild(options),
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
