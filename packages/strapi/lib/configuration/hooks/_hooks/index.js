'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Strapi utilities.
const dictionary = require('strapi-utils').dictionary;

/**
 * Async module loader to create a
 * dictionary of the external hooks
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      async.auto({

        // Load external hooks from the `node_modules` directory.
        externalHooks: function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, 'node_modules'),
            filter: /^(package\.json)$/,
            excludeDirs: /^\./,
            depth: 2
          }, cb);
        }
      },

      // Callback.
      function (err, hooks) {

        // Just in case there is an error.
        if (err) {
          return cb(err);
        }

        // Add the loaded hooks into the hook dictionary exposed at `strapi.hooks`.
        _.extend(strapi.hooks, _.reduce(hooks.externalHooks, function (memo, module, identity) {
          if (module['package.json'] && module['package.json'].strapi && module['package.json'].strapi.isHook) {
            const hookName = identity.match(/^strapi-/) ? identity.replace(/^strapi-/, '') : identity;
            try {
              memo[hookName] = require(identity);
            } catch (err) {
              try {
                memo[hookName] = require(path.resolve(strapi.config.appPath, 'node_modules', identity));
              } catch (err) {
                cb(err);
              }
            }
          }
          return memo;
        }, {}));

        cb();
      });
    }
  };

  return hook;
};
