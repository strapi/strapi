'use strict';

const ts = require('typescript');

const DEFAULT_FILE_NAME = 'tsconfig-server.json';

module.exports = (dir, filename = DEFAULT_FILE_NAME) => {
  return ts.findConfigFile(dir, ts.sys.fileExists, filename);
};
