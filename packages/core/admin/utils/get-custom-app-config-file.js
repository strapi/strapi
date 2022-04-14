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

  const appRegex = new RegExp(`app.${useTypeScript ? 't' : 'j'}sx?$`);

  return files.find(file => file.match(appRegex));
};

module.exports = getCustomAppConfigFile;
