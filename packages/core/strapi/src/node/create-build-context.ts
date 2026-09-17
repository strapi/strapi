import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import browserslist from 'browserslist';
import { createStrapi } from '@strapi/core';
import type { Core, Modules } from '@strapi/types';

import type { CLIContext } from '../cli/types';
import { getStrapiAdminEnvVars, loadEnv } from './core/env';

import { PluginMeta, getEnabledPlugins, getMapOfPluginsWithAdmin } from './core/plugins';
import { AppFile, loadUserAppFile } from './core/admin-customisations';
import { getScanRoots } from './core/scan-roots';
import { getModulePath } from './core/resolve-module';
import type { BaseContext } from './types';

interface BaseOptions {
  stats?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
  bundler?: 'webpack' | 'vite';
  open?: boolean;
}

interface BuildContext extends BaseContext {
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
  options: BaseOptions;
  /**
   * The plugins to be included in the JS bundle
   * incl. internal plugins, third party plugins & local plugins
   */
  plugins: PluginMeta[];
  /**
   * True when the `unstableNextDesignSystem` future flag is on and the bundler is Vite. The single
   * decision point for the Tailwind plugin, the host stylesheet and the scan roots
   */
  nextDesignSystem: boolean;
  /** The directories Tailwind scans. Computed once: the stylesheet, Vite and the watcher share it */
  scanRoots: string[];
}

interface CreateBuildContextArgs extends CLIContext {
  strapi?: Core.Strapi;
  options?: BaseOptions;
  /** If true, Tailwind scans source and not `dist`. E.g. for Vite development server, which serves `admin/src` */
  dev?: boolean;
}

const NEXT_DESIGN_SYSTEM_FLAG = 'unstableNextDesignSystem';

/** The export the flag-on stylesheet imports. Only a design system release with the `next` entry has it */
const NEXT_DESIGN_SYSTEM_ENTRY = '@strapi/design-system/next/source.css';

/** Fails the build when @strapi/admin's closure has no next design system entry, the root the Vite alias resolves from */
const assertNextDesignSystemEntry = (): void => {
  try {
    getModulePath(NEXT_DESIGN_SYSTEM_ENTRY);
  } catch {
    throw new Error(
      [
        `The ${NEXT_DESIGN_SYSTEM_FLAG} future flag needs a @strapi/design-system release that ships the "next" entry, but ${NEXT_DESIGN_SYSTEM_ENTRY} does not resolve.`,
        'Point the application package.json at such a release:',
        '',
        '"resolutions": { "@strapi/design-system": "<version>" }',
        '',
        'npm and pnpm users use "overrides" in place of "resolutions", with the key at the top level of the object.',
        'An entry in "dependencies" is not enough. The override must be global, so that @strapi/admin gets the same copy.',
        'The current release is the experimental dist-tag on npm, see `npm view @strapi/design-system dist-tags`.',
      ].join(os.EOL)
    );
  }
};

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
  dev = false,
}: CreateBuildContextArgs): Promise<BuildContext> => {
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

  const serverAbsoluteUrl = strapiInstance.config.get<string>('server.absoluteUrl');
  const adminAbsoluteUrl = strapiInstance.config.get<string>('admin.absoluteUrl');
  const adminPath = strapiInstance.config.get<string>('admin.path');

  // NOTE: Checks that both the server and admin will be served from the same origin (protocol, host, port)
  const sameOrigin = new URL(adminAbsoluteUrl).origin === new URL(serverAbsoluteUrl).origin;

  const adminPublicPath = new URL(adminAbsoluteUrl).pathname;
  const serverPublicPath = new URL(serverAbsoluteUrl).pathname;

  const appDir = strapiInstance.dirs.app.root;

  await loadEnv(cwd);

  const env = getStrapiAdminEnvVars({
    ADMIN_PATH: adminPublicPath,
    STRAPI_ADMIN_BACKEND_URL: sameOrigin ? serverPublicPath : serverAbsoluteUrl,
    STRAPI_TELEMETRY_DISABLED: String(strapiInstance.telemetry.isDisabled),
    // TODO: Get this url from a utility/consts rather than duplicating it in AIChat constants.ts
    STRAPI_AI_URL:
      process.env.STRAPI_AI_URL?.replace(/\/+$/, '') ?? 'https://strapi-ai.apps.strapi.io',
    STRAPI_ANALYTICS_URL: process.env.STRAPI_ANALYTICS_URL || 'https://analytics.strapi.io',
  });

  // NOTE: Transports `admin.auth.cookie.name` / `path` / `domain` into the bundle; always
  // assigned so ambient STRAPI_ADMIN_AUTH_COOKIE_* env vars cannot make the bundle disagree
  // with the server. Domain falls back to `admin.auth.domain`, matching the server resolution.
  env.STRAPI_ADMIN_AUTH_COOKIE_NAME =
    strapiInstance.config.get<string | undefined>('admin.auth.cookie.name') || '';
  env.STRAPI_ADMIN_AUTH_COOKIE_PATH =
    strapiInstance.config.get<string | undefined>('admin.auth.cookie.path') || '';
  env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN =
    strapiInstance.config.get<string | undefined>('admin.auth.cookie.domain') ||
    strapiInstance.config.get<string | undefined>('admin.auth.domain') ||
    '';

  const envKeys = Object.keys(env);

  if (envKeys.length > 0) {
    logger.debug(
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

  const flagEnabled = strapiInstance.features.future.isEnabled(NEXT_DESIGN_SYSTEM_FLAG);

  if (flagEnabled && bundler !== 'vite') {
    logger.warn(
      `The ${NEXT_DESIGN_SYSTEM_FLAG} future flag needs Vite. Tailwind is not available under ${bundler}, so this build has no next design system`
    );
  }

  const nextDesignSystem = flagEnabled && bundler === 'vite';

  if (nextDesignSystem) {
    assertNextDesignSystemEntry();
  }

  const scanRoots = nextDesignSystem
    ? await getScanRoots({ cwd, runtimeDir, plugins: pluginsWithFront, customisations }, dev)
    : [];

  if (nextDesignSystem) {
    logger.debug('Tailwind scan roots', os.EOL, scanRoots);
  }

  const buildContext: BuildContext = {
    appDir,
    adminPath,
    basePath: adminPublicPath,
    bundler,
    customisations,
    cwd,
    distDir,
    distPath,
    entry,
    env,
    features,
    logger,
    nextDesignSystem,
    options: restOptions,
    plugins: pluginsWithFront,
    runtimeDir,
    scanRoots,
    strapi: strapiInstance,
    target,
    tsconfig,
  };

  return buildContext;
};

export { createBuildContext };
export type { BuildContext, CreateBuildContextArgs };
