import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import camelCase from 'lodash/camelCase';
import { env } from '@strapi/utils';
import { getModule, PackageJson } from './dependencies';
import { convertModulePathToSystemPath, convertSystemPathToModulePath, loadFile } from './files';
import type { BaseContext } from '../types';
import { isError } from './errors';

interface LocalPluginMeta {
  name: string;
  /**
   * camelCased version of the plugin name
   */
  importName: string;
  /**
   * The path to the plugin, relative to the app's root directory
   * in system format
   */
  path: string;
  /**
   * The path to the plugin, relative to the runtime directory
   * in module format (i.e. with forward slashes) because thats
   * where it should be used as an import
   */
  modulePath: string;
  type: 'local';
}

interface ModulePluginMeta {
  name: string;
  /**
   * camelCased version of the plugin name
   */
  importName: string;
  /**
   * Modules don't have a path because we never resolve them to their node_modules
   * because we simply do not require it.
   */
  path?: never;
  /**
   * The path to the plugin, relative to the app's root directory
   * in module format (i.e. with forward slashes)
   */
  modulePath: string;
  type: 'module';
}

type PluginMeta = LocalPluginMeta | ModulePluginMeta;

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
  cwd,
  logger,
  runtimeDir,
  strapi,
}: Pick<BaseContext, 'cwd' | 'logger' | 'strapi' | 'runtimeDir'>): Promise<
  Record<string, PluginMeta>
> => {
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
        importName: camelCase(name),
        type: 'module',
        modulePath: dep,
      };
    }
  }

  const userPluginsFile = await loadUserPluginsFile(strapi.dirs.app.config);

  logger.debug("User's plugins file", os.EOL, userPluginsFile);

  for (const [userPluginName, userPluginConfig] of Object.entries(userPluginsFile)) {
    if (userPluginConfig.enabled && userPluginConfig.resolve) {
      const sysPath = convertModulePathToSystemPath(userPluginConfig.resolve);
      plugins[userPluginName] = {
        name: userPluginName,
        importName: camelCase(userPluginName),
        type: 'local',
        /**
         * User plugin paths are resolved from the entry point
         * of the app, because that's how you import them.
         */
        modulePath: convertSystemPathToModulePath(path.relative(runtimeDir, sysPath)),
        path: sysPath,
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

const getMapOfPluginsWithAdmin = (plugins: Record<string, PluginMeta>) => {
  /**
   * This variable stores the import paths for plugins.
   * The keys are the module paths of the plugins, and the values are the paths
   * to the admin part of the plugins, which is either loaded from the
   * package.json exports or from the legacy strapi-admin.js file.
   */
  const pluginImportPaths: Record<string, string> = {};

  return Object.values(plugins)
    .filter((plugin) => {
      if (!plugin) {
        return false;
      }

      /**
       * There are two ways a plugin should be imported, either it's local to the strapi app,
       * or it's an actual npm module that's installed and resolved via node_modules.
       *
       * We first check if the plugin is local to the strapi app, using a regular `fs.existsSync` because
       * the pathToPlugin will be relative i.e. `/Users/my-name/strapi-app/src/plugins/my-plugin`.
       *
       * If the file doesn't exist well then it's probably a node_module, so instead we use `require.resolve`
       * which will resolve the path to the module in node_modules. If it fails with the specific code `MODULE_NOT_FOUND`
       * then it doesn't have an admin part to the package.
       */
      try {
        const localPluginPath = plugin.path;
        if (localPluginPath) {
          // Here we are loading a locally installed plugin
          const packageJsonPath = path.join(localPluginPath, 'package.json');

          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const localAdminPath = packageJson?.exports?.['./strapi-admin']?.import;

            if (localAdminPath) {
              pluginImportPaths[plugin.modulePath] = localAdminPath;
              return true;
            }
          }

          // Check if legacy admin file exists in local plugin
          if (fs.existsSync(path.join(localPluginPath, 'strapi-admin.js'))) {
            pluginImportPaths[plugin.modulePath] = 'strapi-admin';
            return true;
          }
        }

        // This plugin is a module, so we need to check if it has a strapi-admin export
        if (require.resolve(`${plugin.modulePath}/strapi-admin`)) {
          pluginImportPaths[plugin.modulePath] = 'strapi-admin';
          return true;
        }

        return false;
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
    .map((plugin) => ({
      ...plugin,
      modulePath: `${plugin.modulePath}/${pluginImportPaths[plugin.modulePath]}`,
    }));
};

export { getEnabledPlugins, getMapOfPluginsWithAdmin };
export type { PluginMeta, LocalPluginMeta, ModulePluginMeta };
