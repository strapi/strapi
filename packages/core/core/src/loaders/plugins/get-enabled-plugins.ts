/* eslint-disable @typescript-eslint/no-var-requires */
import { dirname, join, relative, resolve } from 'path';
import { statSync, existsSync } from 'fs';
import _ from 'lodash';
import { get, pickBy, defaultsDeep, map, prop, pipe } from 'lodash/fp';
import { strings } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { getUserPluginsConfig } from './get-user-plugins-config';

interface PluginMeta {
  enabled: boolean;
  pathToPlugin?: string;
  info: Record<string, unknown>;
  packageInfo?: Record<string, unknown>;
}

type PluginMetas = Record<string, PluginMeta>;

interface PluginInfo {
  name: string;
  kind: string;
}

interface PluginDeclaration {
  enabled: boolean;
  resolve: string;
  isModule: boolean;
}

/**
 * otherwise known as "core features"
 *
 * NOTE: These are excluded from the content manager plugin list, as they are always enabled.
 *       See admin.ts server controller on the content-manager plugin for more details.
 */
const INTERNAL_PLUGINS = [
  '@strapi/content-manager',
  '@strapi/content-type-builder',
  '@strapi/email',
  '@strapi/upload',
  '@strapi/i18n',
  '@strapi/content-releases',
  '@strapi/review-workflows',
];

const isStrapiPlugin = (info: PluginInfo) => get('strapi.kind', info) === 'plugin';

interface PluginDirs {
  dist: { root: string };
  app: { root: string };
}

/**
 * Tolerantly load the package.json for a local (declared) plugin.
 *
 * Strategy:
 *  1. Try `pathToPlugin/package.json` (the dist path — correct for compiled TS and JS).
 *  2. On failure, fall back to the equivalent path under `dirs.app.root` (the source tree).
 *     For JS projects `dist.root === app.root`, so step 2 is a no-op retry of the same path.
 *  3. If both fail, return `null` instead of throwing so the plugin can still load via its
 *     strapi-server entry point.
 *
 * `requireFn` defaults to `require` and is injectable for unit testing.
 */
export const loadPluginPackageInfo = (
  pathToPlugin: string,
  dirs: PluginDirs,
  requireFn: (id: string) => unknown = require
): Record<string, unknown> | null => {
  const distPkgPath = join(pathToPlugin, 'package.json');
  try {
    return requireFn(distPkgPath) as Record<string, unknown>;
  } catch {
    // dist package.json missing — try app-root (source) equivalent
    const relToDistRoot = relative(dirs.dist.root, pathToPlugin);
    const srcPkgPath = join(dirs.app.root, relToDistRoot, 'package.json');
    try {
      return requireFn(srcPkgPath) as Record<string, unknown>;
    } catch {
      // both paths unavailable — degrade gracefully
      return null;
    }
  }
};

const validatePluginName = (pluginName: string) => {
  if (!strings.isKebabCase(pluginName)) {
    throw new Error(`Plugin name "${pluginName}" is not in kebab (an-example-of-kebab-case)`);
  }
};

export const toDetailedDeclaration = (declaration: boolean | PluginDeclaration) => {
  if (typeof declaration === 'boolean') {
    return { enabled: declaration };
  }

  const detailedDeclaration: { enabled: boolean; pathToPlugin?: string } = {
    enabled: declaration.enabled,
  };

  if (declaration?.resolve) {
    let pathToPlugin = '';

    if (declaration.isModule) {
      /**
       * we only want the node_module here, not the package.json
       */
      pathToPlugin = join(declaration.resolve, '..');
    } else {
      try {
        pathToPlugin = dirname(require.resolve(declaration.resolve));
      } catch (e) {
        // Local plugins are loaded from the dist root so that compiled TS output is
        // picked up in production. For JS projects dist.root === appDir, so source
        // .js plugins keep resolving unchanged.
        pathToPlugin = resolve(strapi.dirs.dist.root, declaration.resolve);

        if (!existsSync(pathToPlugin) || !statSync(pathToPlugin).isDirectory()) {
          throw new Error(`${declaration.resolve} couldn't be resolved`);
        }
      }
    }

    detailedDeclaration.pathToPlugin = pathToPlugin;
  }

  return detailedDeclaration;
};

export const getEnabledPlugins = async (strapi: Core.Strapi, { client } = { client: false }) => {
  const internalPlugins: PluginMetas = {};

  for (const dep of INTERNAL_PLUGINS) {
    const packagePath = join(dep, 'package.json');

    // NOTE: internal plugins should be resolved from the strapi package
    const packageModulePath = require.resolve(packagePath, {
      paths: [require.resolve('@strapi/strapi/package.json'), process.cwd()],
    });

    const packageInfo = require(packageModulePath);

    validatePluginName(packageInfo.strapi.name);
    internalPlugins[packageInfo.strapi.name] = {
      ...toDetailedDeclaration({ enabled: true, resolve: packageModulePath, isModule: client }),
      info: packageInfo.strapi,
      packageInfo,
    };
  }

  const installedPlugins: PluginMetas = {};
  const dependencies = strapi.config.get('info.dependencies', {});

  for (const dep of Object.keys(dependencies)) {
    const packagePath = join(dep, 'package.json');
    let packageInfo;
    try {
      packageInfo = require(packagePath);
    } catch {
      continue;
    }

    if (isStrapiPlugin(packageInfo)) {
      validatePluginName(packageInfo.strapi.name);
      installedPlugins[packageInfo.strapi.name] = {
        ...toDetailedDeclaration({ enabled: true, resolve: packagePath, isModule: client }),
        info: {
          ...packageInfo.strapi,
          packageName: packageInfo.name,
        },
        packageInfo,
      };
    }
  }

  const declaredPlugins: PluginMetas = {};
  const userPluginsConfig = await getUserPluginsConfig();

  _.forEach(userPluginsConfig, (declaration, pluginName) => {
    validatePluginName(pluginName);

    declaredPlugins[pluginName] = {
      ...toDetailedDeclaration(declaration),
      info: {},
    };

    const { pathToPlugin } = declaredPlugins[pluginName];

    // for manually resolved plugins
    if (pathToPlugin) {
      const packageInfo = loadPluginPackageInfo(pathToPlugin, strapi.dirs);

      if (packageInfo && isStrapiPlugin(packageInfo as unknown as PluginInfo)) {
        declaredPlugins[pluginName].info =
          (packageInfo as { strapi?: Record<string, unknown> }).strapi || {};
        declaredPlugins[pluginName].packageInfo = packageInfo;
      }
    }
  });

  const declaredPluginsResolves = map(prop('pathToPlugin'), declaredPlugins);
  const installedPluginsNotAlreadyUsed = pickBy(
    (p) => !declaredPluginsResolves.includes(p.pathToPlugin),
    installedPlugins
  );

  const enabledPlugins = pipe(
    defaultsDeep(declaredPlugins),
    defaultsDeep(installedPluginsNotAlreadyUsed),
    pickBy((p: PluginMeta) => p.enabled)
  )(internalPlugins);

  return enabledPlugins;
};
