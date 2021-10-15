'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiConfig} StrapiConfig
 */

const path = require('path');
const fs = require('fs-extra');

const requiredPaths = ['api', 'extensions', 'plugins', 'config', 'public'];

/**
 * @param {{ appPath: string }} ctx
 */
const checkFoldersExist = ({ appPath }) => {
  let missingPaths = [];
  for (let reqPath of requiredPaths) {
    if (!fs.pathExistsSync(path.resolve(appPath, reqPath))) {
      missingPaths.push(reqPath);
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(`Missing required folders:\n${missingPaths.map(p => `- ./${p}`).join('\n')}`);
  }
};

/**
 * @param {StrapiConfig} config
 */
module.exports = config => {
  checkFoldersExist(config);
};
