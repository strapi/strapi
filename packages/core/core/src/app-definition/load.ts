import { join } from 'path';
import type { Core } from '@strapi/types';

import { isDiskSource } from './brand';
import { resolveRoutes } from './routes';
import { buildApiModules } from './normalize';
import { loadProgrammaticPlugins } from './plugins';
import type { AppContentType, AppDefinition, Lifecycle } from './types';
import type { RouteBuilder } from './routes';

import { loadAPIsFromDir } from '../loaders/apis';
import { loadComponentsFromDir } from '../loaders/components';
import { loadPoliciesFromDir } from '../loaders/policies';
import { loadLocalMiddlewaresFromDir } from '../loaders/middlewares';
import { loadSrcIndexFromDir } from '../loaders/src-index';
import loadSanitizers from '../loaders/sanitizers';
import loadValidators from '../loaders/validators';
import loadPlugins from '../loaders/plugins';
import { middlewares as internalMiddlewares } from '../middlewares';

/** Sub-paths used when filling resources from a top-level `from` project root. */
const FROM_SUBPATHS = {
  api: ['src', 'api'],
  components: ['src', 'components'],
  policies: ['src', 'policies'],
  middlewares: ['src', 'middlewares'],
  src: ['src'],
} as const;

const fromRoot = (root: string, parts: readonly string[]) => join(root, ...parts);

/**
 * Resolve each programmatic resource (in-code value vs `fromDisk(path)`),
 * apply the top-level `from` fallback for unspecified resources, and populate
 * the registries. Plugins are import-and-added (no `package.json` scan) unless
 * `plugins: fromDisk()` bridges to legacy discovery.
 *
 * Collisions (a disk source and an in-code definition that register the same
 * UID/name) surface as clear startup errors from the underlying registries
 * (`apis`/`content-types`/`plugins` throw "already been registered").
 */
export const runProgrammaticLoaders = async (
  strapi: Core.Strapi,
  app: AppDefinition
): Promise<void> => {
  const rootPath = app.from?.path;

  // Defaults that are not disk-based — always registered (matches legacy).
  loadSanitizers(strapi);
  loadValidators(strapi);

  await loadApiContent(strapi, app, rootPath);
  await loadComponents(strapi, app, rootPath);
  await loadPolicies(strapi, app, rootPath);
  await loadMiddlewares(strapi, app, rootPath);
  await loadPluginsResource(strapi, app);
  loadLifecycles(strapi, app, rootPath);
};

/**
 * Content types + auto-CRUD + custom routes. In-code content types are
 * normalized into `api::<apiName>` modules; a `fromDisk` source loads an API
 * directory via the legacy core; the `from` fallback fills from `<root>/src/api`.
 * In-code custom routes are always attached (to the synthetic `application` API).
 */
const loadApiContent = async (
  strapi: Core.Strapi,
  app: AppDefinition,
  rootPath?: string
): Promise<void> => {
  const ctSource = app.contentTypes;
  const routesSource = app.routes;

  // In-code custom routes (a fromDisk routes source lives inside API folders).
  const inCodeRoutes =
    typeof routesSource === 'function' || Array.isArray(routesSource)
      ? resolveRoutes(routesSource as RouteBuilder | Core.RouteInput[])
      : [];

  if (isDiskSource(ctSource)) {
    await loadAPIsFromDir(strapi, ctSource.path);
    registerApiModules(strapi, buildApiModules([], inCodeRoutes));
    return;
  }

  if (Array.isArray(ctSource)) {
    registerApiModules(strapi, buildApiModules(ctSource as AppContentType[], inCodeRoutes));
    return;
  }

  // contentTypes unspecified: fall back to the project root if provided.
  if (rootPath) {
    await loadAPIsFromDir(strapi, fromRoot(rootPath, FROM_SUBPATHS.api));
  }

  registerApiModules(strapi, buildApiModules([], inCodeRoutes));
};

const registerApiModules = (strapi: Core.Strapi, modules: Record<string, unknown>): void => {
  for (const apiName of Object.keys(modules)) {
    strapi.get('apis').add(apiName, modules[apiName]);
  }
};

/** Components are disk-only in Phase 1 (ADR-0004 / RFC decision 18). */
const loadComponents = async (
  strapi: Core.Strapi,
  app: AppDefinition,
  rootPath?: string
): Promise<void> => {
  if (isDiskSource(app.components)) {
    await loadComponentsFromDir(strapi, app.components.path);
    return;
  }

  if (rootPath) {
    await loadComponentsFromDir(strapi, fromRoot(rootPath, FROM_SUBPATHS.components));
  }
};

const loadPolicies = async (
  strapi: Core.Strapi,
  app: AppDefinition,
  rootPath?: string
): Promise<void> => {
  const source = app.policies;

  if (isDiskSource(source)) {
    await loadPoliciesFromDir(strapi, source.path);
    return;
  }

  if (source) {
    strapi.get('policies').add('global::', source);
    return;
  }

  if (rootPath) {
    await loadPoliciesFromDir(strapi, fromRoot(rootPath, FROM_SUBPATHS.policies));
  }
};

const loadMiddlewares = async (
  strapi: Core.Strapi,
  app: AppDefinition,
  rootPath?: string
): Promise<void> => {
  const source = app.middlewares;
  let globalMiddlewares: Record<string, unknown> = {};

  if (isDiskSource(source)) {
    globalMiddlewares = await loadLocalMiddlewaresFromDir(strapi, source.path);
  } else if (source) {
    globalMiddlewares = source;
  } else if (rootPath) {
    globalMiddlewares = await loadLocalMiddlewaresFromDir(
      strapi,
      fromRoot(rootPath, FROM_SUBPATHS.middlewares)
    );
  }

  strapi.get('middlewares').add('global::', globalMiddlewares);
  strapi.get('middlewares').add('strapi::', internalMiddlewares);
};

const loadPluginsResource = async (strapi: Core.Strapi, app: AppDefinition): Promise<void> => {
  const source = app.plugins;

  // `plugins: fromDisk()` is the only bridge back to legacy discovery
  // (scan package.json deps, load config/plugins.js, apply src/extensions).
  if (isDiskSource(source)) {
    await loadPlugins(strapi);
    return;
  }

  if (source) {
    loadProgrammaticPlugins(strapi, source);
    return;
  }

  // No plugins declared: register an empty enabled-plugins map so downstream
  // consumers see a defined value.
  strapi.config.set('enabledPlugins', {});
};

/**
 * Compose the definition's lifecycles into `strapi.app` so the existing
 * `runUserLifecycles` runs them. If no in-code lifecycles are provided but a
 * `from` root is, load `<root>/src/index.js` instead.
 */
const loadLifecycles = (strapi: Core.Strapi, app: AppDefinition, rootPath?: string): void => {
  const lifecycles: Record<string, Lifecycle> = {};

  for (const name of ['register', 'bootstrap', 'destroy'] as const) {
    const fn = app[name];
    if (typeof fn === 'function') {
      lifecycles[name] = fn;
    }
  }

  if (Object.keys(lifecycles).length > 0) {
    strapi.app = lifecycles;
    return;
  }

  if (rootPath) {
    loadSrcIndexFromDir(strapi, fromRoot(rootPath, FROM_SUBPATHS.src));
  }
};
