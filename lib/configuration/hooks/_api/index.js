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
 * dictionary of the main API
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      async.auto({

        // Load main controllers from `./api/controllers/*.js`.
        'controllers/*': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.controllers),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load main models from `./api/models/*.js` and `./api/models/*.settings.json`.
        'models/*': function (cb) {
          async.parallel({
            settings: function (cb) {
              dictionary.optional({
                dirname: path.resolve(strapi.config.appPath, strapi.config.paths.models),
                filter: /(.+)\.settings.json$/,
                depth: 1
              }, cb);
            },
            functions: function (cb) {
              dictionary.optional({
                dirname: path.resolve(strapi.config.appPath, strapi.config.paths.models),
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

        // Load main services from `./api/services/*.js`.
        'services/*': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.services),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load main policies from `./api/policies/*.js`.
        'policies/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.policies),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load modules from `./modules/**/*.js|json`.
        'modules/**': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.modules),
            filter: /(.+)\.(js|json)$/,
            depth: 5
          }, cb);
        }
      },

      // Callback.
      function (err, api) {

        // Just in case there is an error.
        if (err) {
          return cb(err);
        }

        // Expose loaded controllers from the main API at `strapi.controllers`.
        strapi.controllers = api['controllers/*'];

        // Expose loaded models from the main API at `strapi.models`.
        strapi.models = api['models/*'];

        // Expose loaded services from the main API at `strapi.services`.
        strapi.services = api['services/*'];

        // Expose loaded policies from the main API at `strapi.policies`.
        strapi.policies = api['policies/*'];

        // Expose loaded modules at `strapi.modules`.
        strapi.modules = api['modules/**'];
      });

      cb();
    },

    /**
     * Reload the hook
     */

    reload: function () {
      hook.initialize(function (err) {
        if (err) {
          strapi.log.error('Failed to reinitialize the API hook.');
          strapi.stop();
        } else {
          strapi.emit('hook:_api:reloaded');
        }
      });
    }
  };

  return hook;
};
