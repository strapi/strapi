import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import browserslist from 'browserslist';
import strapiFactory, { CLIContext } from '@strapi/strapi';
import { getConfigUrls } from '@strapi/utils';

import { getStrapiAdminEnvVars, loadEnv } from './core/env';

import type { BuildOptions } from './build';
import { DevelopOptions } from './develop';
import { PluginMeta, getEnabledPlugins, getMapOfPluginsWithAdmin } from './core/plugins';
import { Strapi, FeaturesService } from '@strapi/types';
import { AppFile, loadUserAppFile } from './core/admin-customisations';

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
   * The customisations defined by the user in their app.js file
   */
  customisations?: AppFile;
  /**
   * The bundler to use for building & watching
   */
  bundler: Pick<Required<BuildOptions>, 'bundler'>['bundler'];
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
  /**
   * Features object with future flags
   */
  features?: FeaturesService['config'];
  logger: CLIContext['logger'];
  /**
   * The build options
   */
  options: Pick<BuildOptions, 'minify' | 'sourcemaps' | 'stats'> & Pick<DevelopOptions, 'open'>;
  /**
   * The plugins to be included in the JS bundle
   * incl. internal plugins, third party plugins & local plugins
   */
  plugins: PluginMeta[];
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
  strapi?: Strapi;
  options?: BuildContext['options'] & { bundler?: BuildOptions['bundler'] };
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
  strapi,
  options = {},
}: CreateBuildContextArgs): Promise<BuildContext> => {
  /**
   * If you make a new strapi instance when one already exists,
   * you will overwrite the global and the app will _most likely_
   * crash and die.
   */
  const strapiInstance =
    strapi ??
    strapiFactory({
      // Directories
      appDir: cwd,
      distDir: tsconfig?.config.options.outDir ?? '',
      // Options
      autoReload: true,
      serveAdminPanel: false,
    });

  const { serverUrl, adminPath } = getConfigUrls(strapiInstance.config, true);

  const appDir = strapiInstance.dirs.app.root;

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

  const plugins = await getEnabledPlugins({ cwd, logger, runtimeDir, strapi: strapiInstance });

  logger.debug('Enabled plugins', os.EOL, plugins);

  const pluginsWithFront = getMapOfPluginsWithAdmin(plugins);

  logger.debug('Enabled plugins with FE', os.EOL, pluginsWithFront);

  const target = browserslist.loadConfig({ path: cwd }) ?? DEFAULT_BROWSERSLIST;

  const customisations = await loadUserAppFile({ appDir, runtimeDir });

  const features = strapiInstance.config.get('features', undefined);

  const { bundler = 'webpack', ...restOptions } = options;

  const buildContext = {
    appDir,
    basePath: `${adminPath}/`,
    bundler,
    customisations,
    cwd,
    distDir,
    distPath,
    entry,
    env,
    logger,
    options: restOptions,
    plugins: pluginsWithFront,
    runtimeDir,
    strapi: strapiInstance,
    target,
    tsconfig,
    features,
  } satisfies BuildContext;

  return buildContext;
};

export { createBuildContext };
export type { BuildContext, CreateBuildContextArgs };
