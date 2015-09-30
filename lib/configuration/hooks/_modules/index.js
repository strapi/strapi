'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Local utilities.
const dictionary = require('../../../../util/dictionary');

/**
 * Async module loader to create a
 * dictionary of the user modules
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      _.forEach(strapi.modules, function (definition, module) {
        async.auto({

          // Load module controllers from `./modules/**/api/controllers/*.js`.
          'controllers/*': function (cb) {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.controllers),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load module models from `./modules/**/api/models/*.js` and `./modules/**/api/models/*.settings.json`.
          'models/*': function (cb) {
            async.parallel({
              settings: function (cb) {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.models),
                  filter: /(.+)\.settings.json$/,
                  depth: 1
                }, cb);
              },
              functions: function (cb) {
                dictionary.optional({
                  dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.models),
                  filter: /(.+)\.js$/,
                  depth: 1
                }, cb);
              }
            }, function (err, models) {
              if (err) {
                return cb(err);
              }
              return cb(null, _.merge(models.settings, models.functions));
            });
          },

          // Load module templates from `./modules/**/api/templates/**/*.template.json`.
          'templates/**': function (cb) {
            dictionary.aggregate({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.templates),
              filter: /(.+)\.(template.json)$/,
              depth: 2
            }, cb);
          },

          // Load module services from `./modules/**/api/services/*.js`.
          'services/*': function (cb) {
            dictionary.optional({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.services),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load module policies from `./modules/**/api/policies/*.js`.
          'policies/*': function (cb) {
            dictionary.aggregate({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.policies),
              filter: /(.+)\.(js)$/,
              depth: 1
            }, cb);
          },

          // Load module routes from `./modules/**/config/routes.json`.
          'config/*': function (cb) {
            dictionary.aggregate({
              dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules, module, strapi.config.paths.config),
              excludeDirs: /(locales|environments)$/,
              filter: /^(routes\.json)$/,
              depth: 1
            }, cb);
          }
        },

        // Callback.
        function (err, api) {

          // Just in case there is an error.
          if (err) {
            return cb(err);
          }

          // Expose the module API dictionary.
          strapi.modules[module] = {
            controllers: api['controllers/*'],
            models: api['models/*'],
            services: api['services/*'],
            policies: api['policies/*'],
            config: api['config/*'],
            templates: _.reduce(api['templates/**'], function (result, attributes) {
              return _.merge(result, attributes);
            })
          };

          // Merge module controllers with the main ones.
          strapi.controllers = _.merge(strapi.controllers, strapi.modules[module].controllers);

          // Merge module models with the main ones.
          strapi.models = _.merge(strapi.models, strapi.modules[module].models);

          // Merge module policies with the main ones.
          strapi.policies = _.merge(strapi.policies, strapi.modules[module].policies);

          // Merge module routes with the main ones.
          strapi.config.routes = _.merge(strapi.config.routes, strapi.modules[module].config.routes);
        });
      });

      cb();
    },

    /**
     * Reload the hook
     */

    reload: function () {
      hook.initialize(function (err) {
        if (err) {
          strapi.log.error('Failed to reinitialize the modules hook.');
          strapi.stop();
        } else {
          strapi.emit('hook:_modules:reloaded');
        }
      });
    }
  };

  return hook;
};
