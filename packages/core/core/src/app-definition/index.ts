/**
 * `app-definition` — the programmatic Strapi surface.
 *
 * Internals live in `@strapi/core`; the public surface is re-exported via
 * `@strapi/strapi` (and the `is.*` builders via `@strapi/strapi/attributes`).
 */

export { defineApp } from './define-app';
export { defineComponent } from './define-component';
export { definePlugin } from './define-plugin';
export { defineConfig, defineDatabaseConfig, defineServerConfig } from './config';
export { fromDisk } from './sources';
export {
  isAppDefinition,
  isDiskSource,
  isDefinedPlugin,
  APP_DEFINITION,
  DISK_SOURCE,
  PLUGIN_DEFINITION,
} from './brand';
export { routeVerbs, resolveRoutes } from './routes';

// Internal seams (consumed by the Strapi class / loaders, not the public API).
export { setAppDefinition, getAppDefinition } from './context';
export { runProgrammaticLoaders } from './load';
export {
  buildApiModules,
  normalizeContentType,
  normalizeComponent,
  buildComponentMap,
  CUSTOM_API_NAME,
} from './normalize';
export {
  loadProgrammaticPlugins,
  normalizePluginModule,
  normalizePluginsInput,
  unwrapPluginEntry,
  getAdminPluginResolutions,
} from './plugins';
export type { AdminPluginResolution, ProgrammaticPlugins } from './plugins';

export * as attributes from './attributes';

export type { AppConfig } from './config';
export type { DiskSource, Source } from './sources';
export type { RouteBuilder, RouteVerbs, RouteFn } from './routes';
export type {
  AppDefinition,
  AppInput,
  AppContentType,
  AppComponent,
  PluginEntry,
  PluginModule,
  PluginsInput,
  DefinedPlugin,
  DefinePluginInput,
  Lifecycle,
} from './types';
