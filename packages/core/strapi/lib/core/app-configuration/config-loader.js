'use strict';

const path = require('path');
const fs = require('fs');
const loadFile = require('./load-config-file');

/**
 * @param {string} dir
 */
module.exports = dir => {
  if (!fs.existsSync(dir)) return {};

  /**
   * @type {Record<string, any>}
   */
  const config = {};

  fs.readdirSync(dir, { withFileTypes: true })
    .filter(file => file.isFile())
    .reduce((acc, file) => {
      const key = path.basename(file.name, path.extname(file.name));

      acc[key] = loadFile(path.resolve(dir, file.name));

      return acc;
    }, config);
  return config;
};
