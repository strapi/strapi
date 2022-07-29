'use strict';

const ts = require('typescript');

const DEFAULT_TS_CONFIG_FILENAME = 'tsconfig.json';

module.exports = (dir, filename = DEFAULT_TS_CONFIG_FILENAME) => {
  return ts.findConfigFile(dir, ts.sys.fileExists, filename);
};
