import { defaultsDeep } from 'lodash/fp';
import { env } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { getGlobalId } from '../domain/content-type';
import { isDefinedPlugin } from './brand';
import type { DefinedPlugin, PluginEntry, PluginModule } from './types';

/**
 * The two non-disk shapes the programmatic `plugins` field accepts: the
 * name-keyed map or an array of {@link definePlugin} results. Both consumers
 * (`loadProgrammaticPlugins` at runtime, `getAdminPluginResolutions` for the
 * admin build) normalize this to the map form via {@link normalizePluginsInput}.
 */
export type ProgrammaticPlugins = Record<string, PluginEntry> | DefinedPlugin[];

/**
 * Normalize the programmatic `plugins` field into the canonical name-keyed map.
 *
 * The map form is returned as-is. The array form (each entry a
 * {@link definePlugin} result) is keyed by each entry's own `name`, so the
 * registry UIDs (`plugin::<name>.*`) and admin `resolve` hint line up exactly
 * as they do for the map form. Throws on a duplicate name or a non-definePlugin
 * array entry (a bare module has no name to key on).
 */
export const normalizePluginsInput = (
  plugins: ProgrammaticPlugins
): Record<string, PluginEntry> => {
  if (!Array.isArray(plugins)) {
    return plugins;
  }

  const map: Record<string, PluginEntry> = {};

  for (const entry of plugins) {
    if (!isDefinedPlugin(entry)) {
      throw new Error(
        'The `plugins` array only accepts definePlugin(...) entries (a bare module has no name to key on)'
      );
    }

    const { name, plugin, enabled, config, resolve } = entry;

    if (map[name]) {
      throw new Error(`Duplicate plugin "${name}" in the \`plugins\` array`);
    }

    map[name] = { plugin, enabled, config, resolve };
  }

  return map;
};

/**
 * Same default plugin shape the file-based loader uses, so a programmatic
 * plugin entry behaves identically once registered.
 */
const defaultPlugin = {
  bootstrap() {},
  destroy() {},
  register() {},
  config: {
    default: {},
    validator() {},
  },
  routes: [],
  controllers: {},
  services: {},
  policies: {},
  middlewares: {},
  contentTypes: {},
};

const formatContentTypes = (
  pluginName: string,
  contentTypes: Record<string, { schema: Struct.ContentTypeSchema }>
) => {
  Object.values(contentTypes).forEach((definition) => {
    const { schema } = definition;

    Object.assign(schema, {
      plugin: pluginName,
      collectionName:
        schema.collectionName || `${pluginName}_${schema.info.singularName}`.toLowerCase(),
      globalId: getGlobalId(schema, pluginName),
    });
  });

  return contentTypes;
};

interface UnwrappedEntry {
  module: PluginModule;
  enabled: boolean;
  userConfig: object;
  /** npm package base used by the admin build to import `strapi-admin`. */
  resolve?: string;
}

/**
 * The raw `strapi-server` export shape, where `config` is the
 * `{ default, validator }` descriptor (before the module wraps `config` into an
 * accessor function). Used to read the descriptor without fighting the
 * `Core.Plugin` runtime type.
 */
interface RawPluginServer {
  config?: {
    default?: unknown | ((opts: { env: unknown }) => unknown);
    validator?: (config: unknown) => void;
  };
  contentTypes?: Record<string, { schema: Struct.ContentTypeSchema }>;
  routes?: unknown;
  [key: string]: unknown;
}

/**
 * Normalize a plugin entry (bare module or `{ plugin, enabled?, config? }`)
 * into a uniform shape.
 */
export const unwrapPluginEntry = (entry: PluginEntry): UnwrappedEntry => {
  if (entry && typeof entry === 'object' && 'plugin' in entry) {
    return {
      module: entry.plugin,
      enabled: entry.enabled !== false,
      userConfig: entry.config ?? {},
      resolve: entry.resolve,
    };
  }

  return { module: entry as PluginModule, enabled: true, userConfig: {} };
};

/**
 * A programmatic plugin's admin-build descriptor: its canonical name and the
 * optional npm package base (`resolve`) used to import its `strapi-admin`
 * frontend entry. Disabled plugins are omitted. Consumed by the admin build
 * (`buildAdmin`) so it can derive the frontend plugin set from the in-memory
 * definition instead of scanning `package.json` (ADR-0006, Phase 2).
 */
export interface AdminPluginResolution {
  name: string;
  resolve?: string;
}

/**
 * Derive the enabled plugins' admin-build descriptors from a programmatic
 * `plugins` map. Used by `buildAdmin` to know which plugins to bundle into the
 * admin panel without a `package.json` scan.
 */
export const getAdminPluginResolutions = (
  plugins: ProgrammaticPlugins
): AdminPluginResolution[] => {
  const pluginsMap = normalizePluginsInput(plugins);
  const resolutions: AdminPluginResolution[] = [];

  for (const name of Object.keys(pluginsMap)) {
    const { enabled, resolve } = unwrapPluginEntry(pluginsMap[name]);

    if (!enabled) {
      continue;
    }

    resolutions.push({ name, resolve });
  }

  return resolutions;
};

/**
 * Resolve a plugin module: call it if it's a factory (legacy `{ env }`
 * contract), otherwise use the object as-is.
 */
export const normalizePluginModule = (mod: PluginModule): Core.Plugin => {
  const resolved = typeof mod === 'function' ? mod({ env }) : mod;

  if (!resolved || typeof resolved !== 'object') {
    throw new Error('A plugin entry must resolve to a plugin object (the strapi-server export)');
  }

  return resolved as Core.Plugin;
};

/**
 * Programmatic plugin loading: import-and-add (ADR-0006). No `package.json`
 * scan and no `INTERNAL_PLUGINS` special-casing — only the plugins declared in
 * the map are registered, keyed by canonical name.
 */
export const loadProgrammaticPlugins = (
  strapi: Core.Strapi,
  plugins: ProgrammaticPlugins
): void => {
  const pluginsMap = normalizePluginsInput(plugins);
  const enabledPlugins: Record<string, unknown> = {};
  const loaded: Record<string, Core.Plugin> = {};

  for (const pluginName of Object.keys(pluginsMap)) {
    const { module, enabled, userConfig } = unwrapPluginEntry(pluginsMap[pluginName]);

    if (!enabled) {
      continue;
    }

    const pluginServer = normalizePluginModule(module) as unknown as RawPluginServer;

    const defaultConfig =
      typeof pluginServer.config?.default === 'function'
        ? (pluginServer.config.default as (opts: { env: unknown }) => unknown)({ env })
        : (pluginServer.config?.default ?? {});

    const config = defaultsDeep(defaultConfig, userConfig);

    if (typeof pluginServer.config?.validator === 'function') {
      try {
        pluginServer.config.validator(config);
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(`Error regarding ${pluginName} config: ${e.message}`);
        }
        throw e;
      }
    }

    loaded[pluginName] = {
      ...defaultPlugin,
      ...pluginServer,
      contentTypes: formatContentTypes(pluginName, pluginServer.contentTypes ?? {}),
      config,
      routes: pluginServer.routes ?? defaultPlugin.routes,
    } as unknown as Core.Plugin;

    enabledPlugins[pluginName] = {
      enabled: true,
      info: { name: pluginName },
    };
  }

  strapi.config.set('enabledPlugins', enabledPlugins);

  for (const pluginName of Object.keys(loaded)) {
    strapi.get('plugins').add(pluginName, loaded[pluginName]);
  }
};
