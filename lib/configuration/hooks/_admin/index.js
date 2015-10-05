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
 * dictionary of the admin dashboard
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      async.auto({

        // Load admin controllers from `./admin/controllers/*.js`.
        'controllers/*': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, 'api', strapi.config.paths.controllers),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load admin models from `./admin/models/*.js` and `./admin/models/*.settings.json`.
        'models/*': function (cb) {
          async.parallel({
            settings: function (cb) {
              dictionary.optional({
                dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, 'api', strapi.config.paths.models),
                filter: /(.+)\.settings.json$/,
                depth: 1
              }, cb);
            },
            functions: function (cb) {
              dictionary.optional({
                dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, 'api', strapi.config.paths.models),
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

        // Load admin services from `./admin/services/*.js`.
        'services/*': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, 'api', strapi.config.paths.services),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load admin policies from `./admin/policies/*.js`.
        'policies/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, 'api', strapi.config.paths.policies),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load admin settings from `./admin/config/*.json`.
        'config/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, strapi.config.paths.config),
            excludeDirs: /(locales|environments)$/,
            filter: /(.+)\.(json)$/,
            depth: 2
          }, cb);
        },

        // Load functions scripts config from `./admin/config/functions/*.js`.
        'config/functions/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, strapi.config.paths.config, 'functions'),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load environment-specific config directory from `./admin/config/environments/**/*.json`.
        'config/environments/**': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.admin, strapi.config.paths.config, 'environments', strapi.config.environment),
            filter: /(.+)\.(json)$/,
            depth: 2
          }, cb);
        }
      },

      // Callback.
      function (err, admin) {

        // Just in case there is an error.
        if (err) {
          return cb(err);
        }

        // Expose the admin dictionary.
        strapi.admin = {
          controllers: admin['controllers/*'],
          models: admin['models/*'],
          services: admin['services/*'],
          policies: admin['policies/*'],
          config: _.merge(
            admin['config/*'],
            admin['config/environments/**'],
            admin['config/functions/*']
          )
        };

        // Merge admin controllers with the main ones.
        strapi.controllers = _.merge(strapi.controllers, strapi.admin.controllers);

        // Merge admin models with the main ones.
        strapi.models = _.merge(strapi.models, strapi.admin.models);

        // Merge admin policies with the main ones.
        strapi.policies = _.merge(strapi.policies, strapi.admin.policies);

        // Merge admin routes with the main ones.
        strapi.config.routes = _.merge(strapi.config.routes, strapi.admin.config.routes);
      });

      cb();
    },

    /**
     * Reload the hook
     */

    reload: function () {
      hook.initialize(function (err) {
        if (err) {
          strapi.log.error('Failed to reinitialize the admin hook.');
          strapi.stop();
        } else {
          strapi.emit('hook:_admin:reloaded');
        }
      });
    }
  };

  return hook;
};
