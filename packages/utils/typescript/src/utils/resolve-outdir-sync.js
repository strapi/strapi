'use strict';

const path = require('path');
const { resolveConfigOptions } = require('./resolve-config-options');
const { isUsingTypeScriptSync } = require('./is-using-typescript-sync');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 * @param {string} dir
 * @param {string | undefined} configFilename
 * @returns {string | undefined}
 */
const resolveOutDirSync = (dir, configFilename = DEFAULT_TS_CONFIG_FILENAME) => {
  return isUsingTypeScriptSync(dir)
    ? resolveConfigOptions(path.join(dir, configFilename)).options.outDir
    : undefined;
};

module.exports = { resolveOutDirSync };
