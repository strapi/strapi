'use strict';

const fse = require('fs-extra');

const getConfigPath = require('./get-config-path');

module.exports = (dir, filename = undefined) => {
  const filePath = getConfigPath(dir, filename);

  return fse.pathExists(filePath);
};
