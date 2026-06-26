'use strict';

const path = require('path');
const fse = require('fs-extra');
const resolveConfigOptions = require('./resolve-config-options');
const isUsingTypescript = require('./is-using-typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 *
 * In production mode, if the tsconfig.json is not present but the project
 * was detected as TypeScript (via dist/config/), falls back to 'dist/'.
 *
 * @param {string} dir
 * @param {string | undefined} configFilename
 * @returns {Promise<string | undefined>}
 */
module.exports = async (dir, configFilename = DEFAULT_TS_CONFIG_FILENAME) => {
  if (!(await isUsingTypescript(dir))) {
    return undefined;
  }

  const configPath = path.join(dir, configFilename);

  // In production Docker images, tsconfig.json may not be present.
  // Fall back to the conventional 'dist/' output directory.
  if (!(await fse.pathExists(configPath))) {
    return path.join(dir, 'dist');
  }

  return resolveConfigOptions(configPath).options.outDir;
};
