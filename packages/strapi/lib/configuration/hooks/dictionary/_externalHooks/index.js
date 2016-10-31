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

module.exports = strapi => {
  return {

    /**
     * Initialize the hook
     */

    initialize: cb => {
      async.auto({

        // Load external hooks from the `node_modules` directory.
        externalHooks: cb => {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, 'node_modules'),
            filter: /^(package\.json)$/,
            excludeDirs: /^((?!(strapi-)).)*$/,
            depth: 2
          }, cb);
        }
      },

      // Callback.
      (err, hooks) => {
        // Just in case there is an error.
        if (err) {
          return cb(err);
        }

        // Order hooks to consider specific use cases
        // (ex: Knex needs to be load before Bookshelf)
        const externalHooks = _.pickBy(hooks.externalHooks, hook => {
          return _.get(_.get(hook, 'package.json'), 'strapi.isHook');
        });

        // Array of hook names
        const externalHooksKeys = _.keys(externalHooks);

        // Sort array to load hook in order
        _.forEach(externalHooksKeys, () => {
          _.forEach(externalHooksKeys, (value, index) => {
            const nextTo = _.first(_.get(externalHooks[value]['package.json'], 'strapi.nextTo'));

            if (nextTo) {
              const nextToIndex = _.indexOf(externalHooksKeys, nextTo);

              if (index < nextToIndex) {
                externalHooksKeys.unshift(externalHooksKeys[nextToIndex]);
                externalHooksKeys.splice(nextToIndex + 1, 1);
              }
            }
          });
        });

        // Transform array to object and replace integer key with hook name
        const externalHooksOrdered = _.mapKeys(_.toPlainObject(externalHooksKeys), value => value);

        // Add the loaded hooks into the hook dictionary exposed at `strapi.hooks`.
        _.set(strapi, 'externalHooks', _.reduce(externalHooksOrdered, (memo, module, identity) => {
          const hookName = identity.replace(/^strapi-/, '');

          memo[hookName] = identity;

          return memo;
        }, {}));

        cb();
      });
    }
  };
};
