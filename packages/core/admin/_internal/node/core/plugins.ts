import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import camelCase from 'lodash/camelCase';
import { env } from '@strapi/utils';
import { getModule, PackageJson } from './dependencies';
import { loadFile } from './files';
import { BuildContext } from '../createBuildContext';
import { isError } from './errors';

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

const getEnabledPlugins = async ({
  strapi,
  cwd,
  logger,
}: Pick<BuildContext, 'cwd' | 'logger' | 'strapi'>): Promise<Record<string, PluginMeta>> => {
  const plugins: Record<string, PluginMeta> = {};

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
      return typeof configFile === 'function' ? configFile({ env }) : configFile;
    }
  }

  return {};
};

const getMapOfPluginsWithAdmin = (
  plugins: Record<string, PluginMeta>,
  { runtimeDir }: { runtimeDir: string }
) =>
  Object.values(plugins)
    .filter((plugin) => {
      if (!plugin) {
        return false;
      }

      /**
       * There are two ways a plugin should be imported, either it's local to the strapi app,
       * or it's an actual npm module that's installed and resolved via node_modules.
       *
       * We first check if the plugin is local to the strapi app, using a regular `resolve` because
       * the pathToPlugin will be relative i.e. `/Users/my-name/strapi-app/src/plugins/my-plugin`.
       *
       * If the file doesn't exist well then it's probably a node_module, so instead we use `require.resolve`
       * which will resolve the path to the module in node_modules. If it fails with the specific code `MODULE_NOT_FOUND`
       * then it doesn't have an admin part to the package.
       */
      try {
        const isLocalPluginWithLegacyAdminFile = fs.existsSync(
          //@ts-ignore
          path.resolve(`${plugin.pathToPlugin}/strapi-admin.js`)
        );

        if (!isLocalPluginWithLegacyAdminFile) {
          //@ts-ignore
          let pathToPlugin = plugin.pathToPlugin;

          if (process.platform === 'win32') {
            pathToPlugin = pathToPlugin.split(path.sep).join(path.posix.sep);
          }

          const isModuleWithFE = require.resolve(`${pathToPlugin}/strapi-admin`);

          return isModuleWithFE;
        }

        return isLocalPluginWithLegacyAdminFile;
      } catch (err) {
        if (
          isError(err) &&
          'code' in err &&
          (err.code === 'MODULE_NOT_FOUND' || err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED')
        ) {
          /**
           * the plugin does not contain FE code, so we
           * don't want to import it anyway
           */
          return false;
        }

        throw err;
      }
    })
    .map((plugin) => {
      const systemPath = plugin.isLocal
        ? path.relative(runtimeDir, plugin.pathToPlugin.split('/').join(path.sep))
        : undefined;
      const modulePath = systemPath ? systemPath.split(path.sep).join('/') : undefined;

      return {
        path: !plugin.isLocal
          ? `${plugin.pathToPlugin}/strapi-admin`
          : `${modulePath}/strapi-admin`,
        name: plugin.name,
        importName: camelCase(plugin.name),
      };
    });

export { getEnabledPlugins, getMapOfPluginsWithAdmin };
