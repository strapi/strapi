import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import syncFs from 'node:fs';
import camelCase from 'lodash/camelCase';
import browserslist from 'browserslist';
import strapiFactory, { CLIContext } from '@strapi/strapi';
import type { Strapi } from '@strapi/types';
import { getConfigUrls } from '@strapi/utils';

import { getStrapiAdminEnvVars, loadEnv } from './core/env';
import { isError } from './core/errors';

import type { BuildOptions } from './build';
import { DevelopOptions } from './develop';
import { getEnabledPlugins } from './core/plugins';

interface BuildContext {
  /**
   * The absolute path to the app directory defined by the Strapi instance
   */
  appDir: string;
  /**
   * If a user is deploying the project under a nested public path, we use
   * this path so all asset paths will be rewritten accordingly
   */
  basePath: string;
  /**
   * The current working directory
   */
  cwd: string;
  /**
   * The absolute path to the dist directory
   */
  distPath: string;
  /**
   * The relative path to the dist directory
   */
  distDir: string;
  /**
   * The absolute path to the entry file
   */
  entry: string;
  /**
   * The environment variables to be included in the JS bundle
   */
  env: Record<string, string>;
  logger: CLIContext['logger'];
  /**
   * The build options
   */
  options: Pick<BuildOptions, 'minify' | 'sourcemaps' | 'stats'> & Pick<DevelopOptions, 'open'>;
  /**
   * The plugins to be included in the JS bundle
   * incl. internal plugins, third party plugins & local plugins
   */
  plugins: Array<{
    path: string;
    name: string;
    importName: string;
  }>;
  /**
   * The absolute path to the runtime directory
   */
  runtimeDir: string;
  /**
   * The Strapi instance
   */
  strapi: Strapi;
  /**
   * The browserslist target either loaded from the user's workspace or falling back to the default
   */
  target: string[];
  tsconfig?: CLIContext['tsconfig'];
}

interface CreateBuildContextArgs extends CLIContext {
  options?: BuildContext['options'];
}

const DEFAULT_BROWSERSLIST = [
  'last 3 major versions',
  'Firefox ESR',
  'last 2 Opera versions',
  'not dead',
];

const createBuildContext = async ({
  cwd,
  logger,
  tsconfig,
  options = {},
}: CreateBuildContextArgs) => {
  const strapiInstance = strapiFactory({
    // Directories
    appDir: cwd,
    distDir: tsconfig?.config.options.outDir ?? '',
    // Options
    autoReload: true,
    serveAdminPanel: false,
  });

  const { serverUrl, adminPath } = getConfigUrls(strapiInstance.config, true);

  await loadEnv(cwd);

  const env = getStrapiAdminEnvVars({
    ADMIN_PATH: adminPath,
    STRAPI_ADMIN_BACKEND_URL: serverUrl,
    STRAPI_TELEMETRY_DISABLED: String(strapiInstance.telemetry.isDisabled),
  });

  const envKeys = Object.keys(env);

  if (envKeys.length > 0) {
    logger.info(
      [
        'Including the following ENV variables as part of the JS bundle:',
        ...envKeys.map((key) => `    - ${key}`),
      ].join(os.EOL)
    );
  }

  const distPath = path.join(strapiInstance.dirs.dist.root, 'build');
  const distDir = path.relative(cwd, distPath);

  /**
   * If the distPath already exists, clean it
   */
  try {
    logger.debug(`Cleaning dist folder: ${distPath}`);
    await fs.rm(distPath, { recursive: true, force: true });
    logger.debug('Cleaned dist folder');
  } catch {
    // do nothing, it will fail if the folder does not exist
    logger.debug('There was no dist folder to clean');
  }

  const runtimeDir = path.join(cwd, '.strapi', 'client');
  const entry = path.relative(cwd, path.join(runtimeDir, 'app.js'));

  const plugins = await getEnabledPlugins({ cwd, logger, strapi: strapiInstance });

  logger.debug('Enabled plugins', os.EOL, plugins);

  const pluginsWithFront = Object.values(plugins)
    .filter(filterPluginsByAdminEntry)
    .map((plugin) => ({
      path: !plugin.isLocal
        ? `${plugin.pathToPlugin}/strapi-admin`
        : `${path.relative(runtimeDir, plugin.pathToPlugin)}/strapi-admin`,
      name: plugin.name,
      importName: camelCase(plugin.name),
    }));

  logger.debug('Enabled plugins with FE', os.EOL, plugins);

  const target = browserslist.loadConfig({ path: cwd }) ?? DEFAULT_BROWSERSLIST;

  const buildContext = {
    appDir: strapiInstance.dirs.app.root,
    basePath: `${adminPath}/`,
    cwd,
    distDir,
    distPath,
    entry,
    env,
    logger,
    options,
    plugins: pluginsWithFront,
    runtimeDir,
    strapi: strapiInstance,
    target,
    tsconfig,
  } satisfies BuildContext;

  return buildContext;
};

interface Plugin extends Required<{}> {
  name: string;
}

const filterPluginsByAdminEntry = (plugin: Plugin) => {
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
    const isLocalPluginWithLegacyAdminFile = syncFs.existsSync(
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
    if (isError(err) && 'code' in err && err.code === 'MODULE_NOT_FOUND') {
      /**
       * the plugin does not contain FE code, so we
       * don't want to import it anyway
       */
      return false;
    }

    throw err;
  }
};

export { createBuildContext };
export type { BuildContext, CreateBuildContextArgs };
