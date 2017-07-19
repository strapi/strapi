'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

/**
 * Check that we're in a valid Strapi project.
 *
 * @returns {boolean}
 */

const isStrapiApp = () => {
  const pathToPackageJSON = path.resolve(process.cwd(), 'package.json');
  let validPackageJSON = true;

  try {
    require(pathToPackageJSON);
  } catch (e) {
    validPackageJSON = false;
  }

  return validPackageJSON;
};

module.exports = {
  isStrapiApp
};
