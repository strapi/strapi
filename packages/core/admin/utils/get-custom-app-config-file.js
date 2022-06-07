'use strict';

const { join } = require('path');
const { eq } = require('lodash/fp');
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

  const appJsx = files.find(eq('app.jsx'));
  const appTsx = files.find(eq('app.tsx'));

  if (useTypeScript) {
    return appTsx || appJsx;
  }

  return appJsx;
};

module.exports = getCustomAppConfigFile;
