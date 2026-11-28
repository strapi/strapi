/* eslint-disable @typescript-eslint/no-var-requires */
import { dirname, join, resolve } from 'path';
import { statSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { defaultsDeep, get, pickBy } from 'lodash';
import { strings } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { getUserPluginsConfig, PluginDeclaration } from './get-user-plugins-config';

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

const isStrapiPlugin = (info: PluginInfo) => get(info, 'strapi.kind') === 'plugin';

const validatePluginName = (pluginName: string) => {
  if (!strings.isKebabCase(pluginName)) {
    throw new Error(`Plugin name "${pluginName}" is not in kebab (an-example-of-kebab-case)`);
  }
};

/**
 * A `require` anchored at the app root. The app's plugins are the app's dependencies, so they must
 * be resolved from the app and not from this package: under isolated installs (e.g. pnpm's global
 * virtual store) the app's dependencies are not visible from `@strapi/core`'s own location.
 */
const createAppRequire = (strapi: Core.Strapi) =>
  createRequire(join(strapi.dirs.app.root, 'package.json'));

/**
 * Where to resolve the internal plugins from. `@strapi/core` does not depend on them:
 * `@strapi/strapi` does, and the app depends on `@strapi/strapi`. So `@strapi/strapi` is
 * resolved from the app, and the internal plugins from there. Apps that run `@strapi/core`
 * without `@strapi/strapi` fall back to the working directory.
 */
const getInternalPluginsPaths = (appRequire: NodeRequire) => {
  try {
    return [appRequire.resolve('@strapi/strapi/package.json'), process.cwd()];
  } catch {
    return [process.cwd()];
  }
};

const toDetailedDeclaration = (
  strapi: Core.Strapi,
  appRequire: NodeRequire,
  declaration: boolean | PluginDeclaration
) => {
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
        pathToPlugin = dirname(appRequire.resolve(declaration.resolve));
      } catch {
        pathToPlugin = resolve(strapi.dirs.app.root, declaration.resolve);

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
  const appRequire = createAppRequire(strapi);
  const internalPluginsPaths = getInternalPluginsPaths(appRequire);

  for (const dep of INTERNAL_PLUGINS) {
    const packagePath = join(dep, 'package.json');
    const packageModulePath = require.resolve(packagePath, { paths: internalPluginsPaths });

    const packageInfo = require(packageModulePath);

    validatePluginName(packageInfo.strapi.name);
    internalPlugins[packageInfo.strapi.name] = {
      ...toDetailedDeclaration(strapi, appRequire, {
        enabled: true,
        resolve: packageModulePath,
        isModule: client,
      }),
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
      packageInfo = appRequire(packagePath);
    } catch {
      continue;
    }

    if (isStrapiPlugin(packageInfo)) {
      validatePluginName(packageInfo.strapi.name);
      installedPlugins[packageInfo.strapi.name] = {
        ...toDetailedDeclaration(strapi, appRequire, {
          enabled: true,
          resolve: packagePath,
          isModule: client,
        }),
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

  for (const [pluginName, declaration] of Object.entries(userPluginsConfig)) {
    validatePluginName(pluginName);

    declaredPlugins[pluginName] = {
      ...toDetailedDeclaration(strapi, appRequire, declaration),
      info: {},
    };

    const { pathToPlugin } = declaredPlugins[pluginName];

    // for manually resolved plugins
    if (pathToPlugin) {
      const packagePath = join(pathToPlugin, 'package.json');
      const packageInfo = require(packagePath);

      if (isStrapiPlugin(packageInfo)) {
        declaredPlugins[pluginName].info = packageInfo.strapi || {};
        declaredPlugins[pluginName].packageInfo = packageInfo;
      }
    }
  }

  const declaredPluginsResolves = new Set(
    Object.values(declaredPlugins).map((plugin) => plugin.pathToPlugin)
  );
  const installedPluginsNotAlreadyUsed = pickBy(
    installedPlugins,
    (p) => !declaredPluginsResolves.has(p.pathToPlugin)
  );

  const allPlugins = defaultsDeep(
    {},
    internalPlugins,
    declaredPlugins,
    installedPluginsNotAlreadyUsed
  );
  const enabledPlugins = pickBy(allPlugins, (plugin: PluginMeta) => plugin.enabled);

  return enabledPlugins;
};
