'use strict';
const path = require('path');
const resolveConfigOptions = require('./resolve-config-options');
const isUsingTypescript = require('./is-using-typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 * @param {string} dir
 * @param {string | undefined} configFilename
 * @returns {Promise<string | undefined>}
 */
module.exports = async (dir, configFilename = DEFAULT_TS_CONFIG_FILENAME) => {
  return (await isUsingTypescript(dir))
    ? resolveConfigOptions(path.join(dir, configFilename)).options.outDir
    : undefined;
};
