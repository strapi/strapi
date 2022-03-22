'use strict';

const { join } = require('path');
const fse = require('fs-extra');

/**
 * Retrieve the custom admin entry file name
 * @param {String} dir
 * @param {Boolean} useTypeScript
 * @returns String
 */
const getCustomAppConfigFile = async (dir, useTypeScript) => {
  const adminSrcPath = join(dir, 'src', 'admin');
  const files = await fse.readdir(adminSrcPath);

  if (useTypeScript) {
    return files.find(file => file.match(/app.tsx?$/));
  }

  return files.find(file => file.match(/app.jsx?$/));
};

module.exports = getCustomAppConfigFile;
