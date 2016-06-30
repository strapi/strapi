'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Local utilities.
const json = require('strapi-utils').json;

/**
 * Check if the specified `appPath` contains something that looks
 * like an Strapi application.
 *
 * @param {String} appPath
 */

module.exports = function isStrapiAppSync(appPath) {

  // Has no `package.json` file.
  if (!fs.existsSync(path.join(appPath, 'package.json'))) {
    return false;
  }

  // `package.json` exists, but doesn't list `strapi` as a dependency.
  const appPackageJSON = json.getPackageSync(appPath);
  const appDependencies = appPackageJSON.dependencies;
  if (!(appDependencies && appDependencies.strapi)) {
    return false;
  }

  return true;
};
