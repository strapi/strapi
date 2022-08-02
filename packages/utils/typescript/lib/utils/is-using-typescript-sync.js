'use strict';

const fse = require('fs-extra');

const getConfigPath = require('./get-config-path');

/**
 * Checks if `dir` is a using TypeScript (whether there is a tsconfig file or not)
 * @param {string} dir
 * @param {string | undefined} filename
 * @returns {boolean}
 */
module.exports = (dir, filename = undefined) => {
  const filePath = getConfigPath(dir, { filename });

  return fse.pathExistsSync(filePath);
};
