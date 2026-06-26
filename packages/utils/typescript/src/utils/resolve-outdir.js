'use strict';

const path = require('path');
const { resolveConfigOptions } = require('./resolve-config-options');
const { isUsingTypeScript } = require('./is-using-typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Gets the outDir value from config file (tsconfig)
 * @param {string} dir
 * @param {string | undefined} configFilename
 * @returns {Promise<string | undefined>}
 */
const resolveOutDir = async (dir, configFilename = DEFAULT_TS_CONFIG_FILENAME) => {
  return (await isUsingTypeScript(dir))
    ? resolveConfigOptions(path.join(dir, configFilename)).options.outDir
    : undefined;
};

module.exports = { resolveOutDir };
