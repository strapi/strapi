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
 * dictionary of the user APIs.
 */

module.exports = strapi => {
  return {

    /**
     * Initialize the hook
     */

    initialize: cb => {
      _.forEach(strapi.api, (definition, api) => {
        async.auto({

          // Expose the `name` of the API for the callback.
          'name': cb => {
            cb(null, api);
          },

          // Load API controllers from `./api/*/controllers/*.js`.
          'controllers/*': cb => {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.controllers),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load API models from `./api/*/models/*.js` and `./api/*/models/*.settings.json`.
          'models/*': cb => {
            async.parallel({
              settings: cb => {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.models),
                  filter: /(.+)\.settings.json$/,
                  depth: 1
                }, cb);
              },
              functions: cb => {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.models),
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

          // Load API services from `./api/*/services/*.js`.
          'services/*': cb => {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.services),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load API policies from `./api/*/config/policies/*.js`.
          'policies/*': cb => {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.config, strapi.config.paths.policies),
              filter: /(.+)\.(js)$/,
              depth: 2
            }, cb);
          },

          // Load API validators from `./api/*/config/validators/*.js`.
          'validators/*': cb => {
            dictionary.aggregate({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.config, strapi.config.paths.validators),
              filter: /(.+)\.(json|js)$/,
              depth: 2
            }, cb);
          },

          // Load API config from `./api/*/config/*.js|json` and `./api/*/config/environments/**/*.js|json`.
          'config/**': cb => {
            async.parallel({
              common: cb => {
                dictionary.aggregate({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.config),
                  excludeDirs: /(locales|environments)$/,
                  filter: /(.+)\.(js|json)$/,
                  depth: 2
                }, cb);
              },
              specific: cb => {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api, api, strapi.config.paths.config, 'environments', strapi.config.environment),
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
        (err, api) => {

          // Just in case there is an error.
          if (err) {
            return cb(err);
          }

          // Expose the API dictionary.
          strapi.api[api.name] = {
            controllers: api['controllers/*'],
            models: api['models/*'],
            services: api['services/*'],
            policies: api['policies/*'],
            validators: api['validators/*'],
            config: api['config/**']
          };

          // Delete the definition if it's empty.
          strapi.api[api.name] = _.omitBy(strapi.api[api.name], _.isEmpty);

          // If the module doesn't have a definition at all
          // just remove it completely from the dictionary.
          if (_.isEmpty(strapi.api[api.name])) {
            delete strapi.api[api.name];
          }

          // Merge API controllers with the main ones.
          strapi.controllers = _.merge({}, strapi.controllers, _.get(strapi.api, api.name + '.controllers'));

          // Merge API services with the main ones.
          strapi.services = _.merge({}, strapi.services, _.get(strapi.api, api.name + '.services'));

          // Merge API models with the main ones.
          strapi.models = _.merge({}, strapi.models, _.get(strapi.api, api.name + '.models'));

          // Merge API routes with the main ones.
          strapi.config.routes = _.union([], strapi.config.routes, _.get(strapi.api, api.name + '.config.routes'));
        });
      });

      cb();
    }
  };
};
