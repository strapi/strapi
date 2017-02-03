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
 * dictionary of the user plugins.
 */

module.exports = strapi => {
  return {

    /**
     * Initialize the hook
     */

    initialize: cb => {
      _.forEach(strapi.plugins, (definition, plugin) => {
        async.auto({

          // Expose the `name` of the plugin for the callback.
          'name': cb => {
            cb(null, plugin);
          },

          // Load API controllers from `./plugins/*/controllers/*.js`.
          'controllers/*': cb => {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.controllers),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load API models from `./plugins/*/models/*.js` and `./plugins/*/models/*.settings.json`.
          'models/*': cb => {
            async.parallel({
              settings: cb => {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.models),
                  filter: /(.+)\.settings.json$/,
                  depth: 1
                }, cb);
              },
              functions: cb => {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.models),
                  filter: /(.+)\.js$/,
                  depth: 1
                }, cb);
              }
            }, (err, models) => {
              if (err) {
                return cb(err);
              }

              return cb(null, _.merge(models.settings, models.functions));
            });
          },

          // Load API services from `./plugins/*/services/*.js`.
          'services/*': cb => {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.services),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load API policies from `./plugins/*/policies/*.js`.
          'policies/*': cb => {
            dictionary.aggregate({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.policies),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load API config from `./plugins/*/config/*.js|json` and `./plugins/*/config/environments/**/*.js|json`.
          'config/**': cb => {
            async.parallel({
              common: cb => {
                dictionary.aggregate({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.config),
                  excludeDirs: /(locales|environments)$/,
                  filter: /(.+)\.(js|json)$/,
                  depth: 2
                }, cb);
              },
              specific: cb => {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins, plugin, strapi.config.paths.config, 'environments', strapi.config.environment),
                  filter: /(.+)\.(js|json)$/,
                  depth: 1
                }, cb);
              }
            }, (err, config) => {
              if (err) {
                return cb(err);
              }

              return cb(null, _.merge(config.common, config.specific));
            });
          }
        },

        // Callback.
        (err, plugin) => {

          // Just in case there is an error.
          if (err) {
            return cb(err);
          }

          // Expose the API dictionary.
          strapi.plugins[plugin.name] = {
            controllers: plugin['controllers/*'],
            models: plugin['models/*'],
            services: plugin['services/*'],
            policies: plugin['policies/*'],
            config: plugin['config/**']
          };

          // Delete the definition if it's empty.
          strapi.plugins[plugin.name] = _.omitBy(_.get(strapi.plugins, plugin.name), _.isEmpty);

          // Merge API routes with the main ones.
          _.set(strapi.config, 'plugins.routes.' + plugin.name, _.get(strapi.plugins, plugin.name + '.config.routes'));

          // If the module doesn't have a definition at all
          // just remove it completely from the dictionary.
          if (_.isEmpty(strapi.plugins[plugin.name])) {
            delete strapi.plugins[plugin.name];
          }
        });
      });

      cb();
    }
  };
};
