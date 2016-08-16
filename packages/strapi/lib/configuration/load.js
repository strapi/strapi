'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const async = require('async');

// Local utilities.
const json = require('strapi-utils').json;

/**
 * Expose Configuration loader
 *
 * Load command-line overrides
 *
 * For reference, config priority is:
 *   -> implicit defaults
 *   -> environment variables
 *   -> user config files
 *   -> local config file
 *   -> configOverride (in call to `strapi.start()`)
 *   -> --cmdline args
 */

module.exports = function (strapi) {
  return cb => {

    // Commence with loading/validating/defaulting all the rest of the config.
    async.auto({

      /**
       * Expose version/dependency info for the currently-running
       * Strapi on the `strapi` object (from its `package.json`).
       */

      versionAndDependencyInfo: cb => {
        const pathToThisVersionOfStrapi = path.join(__dirname, '..', '..');

        json.getPackage(pathToThisVersionOfStrapi, function (err, pkg) {
          if (err) {
            return cb(err);
          }

          strapi.version = pkg.version;
          strapi.dependencies = pkg.dependencies;

          cb();
        });
      }
    }, err => {
      if (err) {
        return cb(err);
      }

      // Override the previous contents of `strapi.config` with the new, validated
      // config with defaults and overrides mixed in the appropriate order.
      strapi.config = this.defaults(strapi.config.appPath || process.cwd());

      cb();
    });
  };
};
