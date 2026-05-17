'use strict';

const path = require('path');
const fse = require('fs-extra');
const resolveConfigOptions = require('./resolve-config-options');
const isUsingTypescriptSync = require('./is-using-typescript-sync');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 *
 * In production mode, if the tsconfig.json is not present but the project
 * was detected as TypeScript (via dist/config/), falls back to 'dist/'.
 *
 * @param {string} dir
 * @param {string | undefined} configFilename
 * @returns {string | undefined}
 */
module.exports = (dir, configFilename = DEFAULT_TS_CONFIG_FILENAME) => {
  if (!isUsingTypescriptSync(dir)) {
    return undefined;
  }

  const configPath = path.join(dir, configFilename);

  // In production Docker images, tsconfig.json may not be present.
  // Fall back to the conventional 'dist/' output directory.
  if (!fse.pathExistsSync(configPath)) {
    return path.join(dir, 'dist');
  }

  return resolveConfigOptions(configPath).options.outDir;
};
