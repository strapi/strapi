/**
 * `app-definition` — the programmatic ("Strapi as a primitive") surface.
 *
 * Internals live in `@strapi/core`; the public surface is re-exported via
 * `@strapi/strapi` (and the `is.*` builders via `@strapi/strapi/attributes`).
 */

export { defineApp } from './define-app';
export { defineConfig, defineDatabaseConfig, defineServerConfig } from './config';
export { fromDisk } from './sources';
export { isAppDefinition, isDiskSource, APP_DEFINITION, DISK_SOURCE } from './brand';
export { routeVerbs, resolveRoutes } from './routes';

// Internal seams (consumed by the Strapi class / loaders, not the public API).
export { setAppDefinition, getAppDefinition } from './context';
export { runProgrammaticLoaders } from './load';
export { buildApiModules, normalizeContentType, CUSTOM_API_NAME } from './normalize';
export { loadProgrammaticPlugins, normalizePluginModule, unwrapPluginEntry } from './plugins';

export * as attributes from './attributes';

export type { AppConfig } from './config';
export type { DiskSource, Source } from './sources';
export type { RouteBuilder, RouteVerbs, RouteFn } from './routes';
export type {
  AppDefinition,
  AppInput,
  AppContentType,
  PluginEntry,
  PluginModule,
  Lifecycle,
} from './types';
