import os from 'node:os';
import path from 'node:path';
import { getModule, PackageJson } from './dependencies';
import { loadFile } from './files';
import { BuildContext, CreateBuildContextArgs } from '../createBuildContext';

const CORE_PLUGINS = [
  '@strapi/plugin-content-manager',
  '@strapi/plugin-content-type-builder',
  '@strapi/plugin-email',
  '@strapi/plugin-upload',
];

interface PluginMeta {
  name: string;
  pathToPlugin: string;
  isLocal?: boolean;
}

interface StrapiPlugin extends PackageJson {
  strapi: {
    description?: string;
    displayName?: string;
    kind: 'plugin';
    name?: string;
    required?: boolean;
  };
}

const validatePackageHasStrapi = (
  pkg: PackageJson
): pkg is PackageJson & { strapi: Record<string, unknown> } =>
  'strapi' in pkg &&
  typeof pkg.strapi === 'object' &&
  !Array.isArray(pkg.strapi) &&
  pkg.strapi !== null;

const validatePackageIsPlugin = (pkg: PackageJson): pkg is StrapiPlugin =>
  validatePackageHasStrapi(pkg) && pkg.strapi.kind === 'plugin';

export const getEnabledPlugins = async ({
  strapi,
  cwd,
  logger,
}: Pick<BuildContext, 'cwd' | 'logger' | 'strapi'>) => {
  const plugins: Record<string, PluginMeta> = {};

  logger.debug('Core plugins', os.EOL, CORE_PLUGINS);

  for (const plugin of CORE_PLUGINS) {
    const pkg = await getModule(plugin, cwd);

    if (pkg && validatePackageIsPlugin(pkg)) {
      /**
       * We know there's a name because these are our packages.
       */
      const name = (pkg.strapi.name || pkg.name)!;

      plugins[name] = {
        name,
        pathToPlugin: plugin,
      };
    }
  }

  /**
   * This is the list of dependencies that are installed in the user's project.
   * It will include libraries like "react", so we need to collect the ones that
   * are plugins.
   */
  const deps = strapi.config.get('info.dependencies', {});

  logger.debug("Dependencies from user's project", os.EOL, deps);

  for (const dep of Object.keys(deps)) {
    const pkg = await getModule(dep, cwd);

    if (pkg && validatePackageIsPlugin(pkg)) {
      const name = pkg.strapi.name || pkg.name;

      if (!name) {
        /**
         * Unlikely to happen, but you never know.
         */
        throw Error(
          "You're trying to import a plugin that doesn't have a name – check the package.json of that plugin!"
        );
      }

      plugins[name] = {
        name,
        pathToPlugin: dep,
      };
    }
  }

  const userPluginsFile = await loadUserPluginsFile(strapi.dirs.app.config);

  logger.debug("User's plugins file", os.EOL, userPluginsFile);

  for (const [userPluginName, userPluginConfig] of Object.entries(userPluginsFile)) {
    if (userPluginConfig.enabled && userPluginConfig.resolve) {
      plugins[userPluginName] = {
        name: userPluginName,
        isLocal: true,
        /**
         * User plugin paths are resolved from the entry point
         * of the app, because that's how you import them.
         */
        pathToPlugin: userPluginConfig.resolve,
      };
    }
  }

  return plugins;
};

const PLUGIN_CONFIGS = ['plugins.js', 'plugins.mjs', 'plugins.ts'];

type UserPluginConfigFile = Record<string, { enabled: boolean; resolve: string }>;

const loadUserPluginsFile = async (root: string): Promise<UserPluginConfigFile> => {
  for (const file of PLUGIN_CONFIGS) {
    const filePath = path.join(root, file);
    const configFile = await loadFile(filePath);

    if (configFile) {
      /**
       * Configs can be a function or they can be just an object!
       */
      return typeof configFile === 'function' ? configFile() : configFile;
    }
  }

  return {};
};
