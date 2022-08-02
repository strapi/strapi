'use strict';

const path = require('path');
const ts = require('typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';

module.exports = (dir, { filename = DEFAULT_TS_CONFIG_FILENAME, ancestorsLookup = false } = {}) => {
  const dirAbsolutePath = path.resolve(dir);
  const configFilePath = ts.findConfigFile(dirAbsolutePath, ts.sys.fileExists, filename);

  if (!configFilePath || ancestorsLookup) {
    return configFilePath;
  }

  return configFilePath.startsWith(dirAbsolutePath);
};
