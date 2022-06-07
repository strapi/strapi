'use strict';

const { join } = require('path');
const fse = require('fs-extra');
const { isUsingTypeScript } = require('@strapi/typescript-utils');

/**
 * Retrieve the custom admin entry file name
 * @param {String} dir - Directory of the admin panel
 * @returns String
 */
const getCustomAppConfigFile = async dir => {
  const adminSrcPath = join(dir, 'src', 'admin');
  const useTypeScript = await isUsingTypeScript(adminSrcPath, 'tsconfig.json');

  const files = await fse.readdir(adminSrcPath);

  const appJsx = files.find(file => /^app.jsx?$/.test(file));
  const appTsx = files.find(file => /^app.tsx?$/.test(file));

  if (useTypeScript) {
    return appTsx || appJsx;
  }

  return appJsx;
};

module.exports = getCustomAppConfigFile;
