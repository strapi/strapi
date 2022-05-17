'use strict';
const resolveConfigOptions = require('./resolve-config-options');
const isUsingTypescript = require('./is-using-typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';
/**
 * Checks if `dir` is a using TypeScript (whether there is a tsconfig file or not)
 * @param {string} dir
 * @param {string | undefined} configFilename
 * @returns {string | undefined}
 */
module.exports = async (dir, configFilename = DEFAULT_TS_CONFIG_FILENAME) => {
  return (await isUsingTypescript(dir))
    ? resolveConfigOptions(`${dir}/${configFilename}`).options.outDir
    : undefined;
};
