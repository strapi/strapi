'use strict';

const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const chalk = require('chalk');
const ora = require('ora');
const ts = require('typescript');
const strapi = require('@strapi/strapi');
const { build: nodeBuild, develop: nodeDevelop } = require('./dist/cli');

/**
 * @typedef {Object} BuildArgs
 * @property {boolean} optimize
 */

/**
 * @deprecated From V5 we will not be exporting build functions from the root export of the admin package.
 *
 * @type {(args: BuildArgs) => Promise<void>}
 */
async function build({ optimize }) {
  console.warn(
    "[@strapi/admin]: the build api exported from this package is now deprecated. We don't plan to expose this for public consumption and this will be removed in V5."
  );

  const enforceSourceMaps = process.env.STRAPI_ENFORCE_SOURCEMAPS === 'true' ?? false;

  const cwd = process.cwd();
  const logger = createLogger({ debug: true, silent: false, timestamp: false });

  const tsconfig = loadTsConfig({
    cwd,
    path: 'tsconfig.json',
    logger,
  });

  const distDir = tsconfig?.config.options.outDir ?? '';

  const strapiInstance = strapi({
    // Directories
    appDir: cwd,
    distDir,
    // Options
    autoReload: true,
    serveAdminPanel: false,
  });

  await nodeBuild({
    cwd,
    logger,
    minify: optimize,
    sourcemaps: enforceSourceMaps,
    strapi: strapiInstance,
    tsconfig,
  });
}

/**
 * @typedef {Object} CleanArgs
 * @property {string} appDir
 * @property {string} buildDestDir
 */

/**
 * @deprecated From V5 we will not be exporting clean functions from the root export of the admin package.
 *
 * @type {(args: CleanArgs) => Promise<void>}
 */
async function clean({ appDir, buildDestDir }) {
  console.warn(
    "[@strapi/admin]: the clean api exported from this package is now deprecated. We don't plan to expose this for public consumption and this will be removed in V5."
  );

  const DIRECTORIES = [
    path.join(buildDestDir, 'build'),
    path.join(appDir, '.cache'),
    path.join(appDir, '.strapi'),
  ];

  await Promise.all(DIRECTORIES.map((dir) => fs.rmdir(dir, { recursive: true, force: true })));
}

/**
 * @typedef {Object} WatchArgs
 * @property {boolean} browser
 * @property {boolean} open
 * @property {boolean} polling
 */

/**
 * @deprecated From V5 we will not be exporting watch functions from the root export of the admin package.
 *
 * @type {(args: WatchArgs) => Promise<void>}
 */
async function watchAdmin({ browser, open, polling }) {
  console.warn(
    [
      "[@strapi/admin]: the watchAdmin api exported from this package is now deprecated. We don't plan to expose this for public consumption and this will be removed in V5.",
      "This command is no longer necessary, the admin's dev server is now injected as a middleware to the strapi server. This is why we're about to start a strapi instance for you.",
    ].join(os.EOL)
  );

  const cwd = process.cwd();
  const logger = createLogger({ debug: false, silent: false, timestamp: false });

  const tsconfig = loadTsConfig({
    cwd,
    path: 'tsconfig.json',
    logger,
  });

  const distDir = tsconfig?.config.options.outDir ?? '';

  const strapiInstance = strapi({
    // Directories
    appDir: cwd,
    distDir,
    // Options
    autoReload: true,
    serveAdminPanel: false,
  });

  await nodeDevelop({
    cwd,
    logger,
    browser,
    open,
    polling,
    strapi: strapiInstance,
    tsconfig,
  });
}

/**
 * @internal
 */
const createLogger = (options = {}) => {
  const { silent = false, debug = false, timestamp = true } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(
        chalk.cyan(`[DEBUG]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(
        chalk.blue(`[INFO]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    log(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`${timestamp ? `\t[${new Date().toISOString()}]` : ''}`), ...args);
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(
        chalk.yellow(`[WARN]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(
        chalk.red(`[ERROR]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    spinner(text) {
      if (silent) {
        return {
          succeed() {
            return this;
          },
          fail() {
            return this;
          },
          start() {
            return this;
          },
          text: '',
        };
      }

      return ora(text);
    },
  };
};

/**
 * @internal
 */
const loadTsConfig = ({ cwd, path, logger }) => {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, path);

  if (!configPath) {
    return undefined;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd);

  logger.debug(`Loaded user TS config:`, os.EOL, parsedConfig);

  return {
    config: parsedConfig,
    path: configPath,
  };
};

module.exports = {
  clean,
  build,
  watchAdmin,
};
