'use strict';

const path = require('path');
const ts = require('typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';

/**
 * Get the path of the typescript config file for a given directory
 *
 * @param {string} dir
 * @param {object} [options]
 * @param {string} [options.filename]
 * @param {boolean} [options.ancestorsLookup]
 *
 * @return {string | undefined}
 */
module.exports = (dir, { filename = DEFAULT_TS_CONFIG_FILENAME, ancestorsLookup = false } = {}) => {
  const dirAbsolutePath = path.resolve(dir);
  let configFilePath = ts.findConfigFile(dirAbsolutePath, ts.sys.fileExists, filename);

  if (configFilePath) configFilePath = path.resolve(configFilePath);

  if (!configFilePath || ancestorsLookup) {
    return configFilePath;
  }

  return configFilePath.startsWith(dirAbsolutePath) ? configFilePath : undefined;
};
