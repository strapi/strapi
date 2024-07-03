import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import browserslist from 'browserslist';
import { createStrapi } from '@strapi/core';
import { Core, Modules } from '@strapi/types';
import type { Server } from 'node:http';

import type { CLIContext } from '../cli/types';
import { getStrapiAdminEnvVars, loadEnv } from './core/env';

import { PluginMeta, getEnabledPlugins, getMapOfPluginsWithAdmin } from './core/plugins';
import { AppFile, loadUserAppFile } from './core/admin-customisations';
import type { BaseContext } from './types';

interface BaseOptions {
  stats?: boolean;
  minify?: boolean;
  sourcemaps?: boolean;
  bundler?: 'webpack' | 'vite';
  open?: boolean;
  hmrServer?: Server;
  hmrClientPort?: number;
}

interface BuildContext<TOptions = unknown> extends BaseContext {
  /**
   * The customisations defined by the user in their app.js file
   */
  customisations?: AppFile;
  /**
   * Features object with future flags
   */
  features?: Modules.Features.FeaturesService['config'];
  /**
   * The build options
   */
  options: BaseOptions & TOptions;
  /**
   * The plugins to be included in the JS bundle
   * incl. internal plugins, third party plugins & local plugins
   */
  plugins: PluginMeta[];
}

interface CreateBuildContextArgs<TOptions = unknown> extends CLIContext {
  strapi?: Core.Strapi;
  options?: TOptions;
}

const DEFAULT_BROWSERSLIST = [
  'last 3 major versions',
  'Firefox ESR',
  'last 2 Opera versions',
  'not dead',
];

const createBuildContext = async <TOptions extends BaseOptions>({
  cwd,
  logger,
  tsconfig,
  strapi,
  options = {} as TOptions,
}: CreateBuildContextArgs<TOptions>): Promise<BuildContext<TOptions>> => {
  /**
   * If you make a new strapi instance when one already exists,
   * you will overwrite the global and the app will _most likely_
   * crash and die.
   */
  const strapiInstance =
    strapi ??
    createStrapi({
      // Directories
      appDir: cwd,
      distDir: tsconfig?.config.options.outDir ?? '',
      // Options
      autoReload: true,
      serveAdminPanel: false,
    });

  const serverUrl = strapiInstance.config.get<string>('server.url');
  const adminPath = strapiInstance.config.get<string>('admin.path');

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

  const { bundler = 'vite', ...restOptions } = options;

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
    features,
    logger,
    options: restOptions as BaseOptions & TOptions,
    plugins: pluginsWithFront,
    runtimeDir,
    strapi: strapiInstance,
    target,
    tsconfig,
  } satisfies BuildContext<TOptions>;

  return buildContext;
};

export { createBuildContext };
export type { BuildContext, CreateBuildContextArgs };
