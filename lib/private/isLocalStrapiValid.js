'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');

// Local utilities.
const json = require('../../util/json');

/**
 * Check if the specified installation of Strapi is valid for the specified project.
 *
 * @param strapiPath
 * @param appPath
 */

module.exports = function isLocalStrapiValid(strapiPath, appPath) {
  const self = this;

  // Has no `package.json` file.
  if (!fs.existsSync(appPath + '/package.json')) {
    self.log.error(
      'Cannot read `package.json` in the current directory (`' +
        process.cwd() +
        '`).'
    );
    self.log.error('Are you sure this is a Strapi application?');
    process.exit(1);
  }

  // Load this application's `package.json` and dependencies.
  const appPackageJSON = json.getPackageSync(appPath);
  const appDependencies = appPackageJSON.dependencies;

  // `package.json` exists, but doesn't list `strapi` as a dependency.
  if (!(appDependencies && appDependencies.strapi)) {
    self.log.warn(
      'The `package.json` in the current directory does not list Strapi as a dependency...'
    );
    self.log.warn(
      'Are you sure ' + process.cwd() + ' is a Strapi application?'
    );
    return;
  }

  // Ensure the target Strapi exists.
  if (!fs.existsSync(strapiPath)) {
    return false;
  }

  // Read the `package.json` in the local installation of Strapi.
  const strapiPackageJSON = json.getPackageSync(strapiPath);

  // Local Strapi has a corrupted `package.json`.
  if (!strapiPackageJSON) {
    self.log.warn(
      'The local Strapi dependency has a corrupted `package.json`.'
    );
    self.log.warn('You may consider running:');
    self.log.warn(
      '`$ rm -rf ' +
        strapiPath +
        ' && npm install strapi@' +
        appDependencies.strapi +
        '`'
    );
    return;
  }

  // If we made it this far, the target Strapi installation must be OK.
  return true;
};
