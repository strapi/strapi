import type { Core } from '@strapi/types';

/**
 * Root config keys that Strapi sets at startup, with no config file. See `loadConfiguration` in
 * `src/configuration/index.ts`, and `src/loaders/plugins/index.ts` for `enabledPlugins`.
 */

/** `strapi.config.get('launchedAt')`: when the configuration was loaded, in milliseconds. */
export type LaunchedAt = number;

/** `strapi.config.get('autoReload')`: whether the server restarts on file changes (`strapi develop`). */
export type AutoReload = boolean;

/** `strapi.config.get('environment')`: `NODE_ENV`, `'development'` when it is not set. */
export type Environment = string;

/** `strapi.config.get('uuid')`: `strapi.uuid` from the application's `package.json`, if any. */
export type Uuid = string | undefined;

/** `strapi.config.get('installId')`: `strapi.installId` from the application's `package.json`, if any. */
export type InstallId = string | undefined;

/** `strapi.config.get('packageJsonStrapi')`: the `strapi` key of `package.json`, without `uuid`. */
export type PackageJsonStrapi = Record<string, unknown>;

/** `strapi.config.get('info')`: the application's `package.json`, with the Strapi version. */
export type Info = {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  /** The version of `@strapi/core`. */
  strapi: string;
  [key: string]: unknown;
};

/** `strapi.config.get('dirs')`: the application's source and build directories. */
export type Dirs = Core.StrapiDirectories;

/** An enabled plugin, as the plugin loader resolves it. */
export type EnabledPlugin = {
  enabled: boolean;
  pathToPlugin?: string;
  info: Record<string, unknown>;
  packageInfo?: Record<string, unknown>;
};

/** `strapi.config.get('enabledPlugins')`: enabled plugins by name, set once plugins are loaded. */
export type EnabledPlugins = Record<string, EnabledPlugin>;
