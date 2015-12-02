'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Local utilities.
const dictionary = require('../../../../util/dictionary');

/**
 * Async module loader to create a
 * dictionary of the user config
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      async.auto({

        // Load common settings from `./config/*.js|json`.
        'config/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config),
            excludeDirs: /(locales|environments)$/,
            filter: /(.+)\.(js|json)$/,
            depth: 2
          }, cb);
        },

        // Load locales from `./config/locales/*.json`.
        'config/locales/*': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'locales'),
            filter: /(.+)\.(json)$/,
            identity: false,
            depth: 1
          }, cb);
        },

        // Load functions config from `./config/functions/*.js`.
        'config/functions/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'functions'),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load all environments config from `./config/environments/*/*.js|json`.
        // Not really used inside the framework but useful for the Studio.
        'config/environments/**': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments'),
            filter: /(.+)\.(js|json)$/,
            identity: false,
            depth: 4
          }, cb);
        },

        // Load environment-specific config from `./config/environments/**/*.js|json`.
        'config/environments/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments', strapi.config.environment),
            filter: /(.+)\.(js|json)$/,
            depth: 1
          }, cb);
        },

        // Load APIs from `./api/**/*.js|json`.
        'api/**': function (cb) {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api),
            excludeDirs: /(public)$/,
            filter: /(.+)\.(js|json)$/,
            depth: 4
          }, cb);
        }
      },

      // Callback.
      function (err, config) {

        // Just in case there is an error.
        if (err) {
          return cb(err);
        }

        // Merge every user config together.
        const mergedConfig = _.merge(
          config['config/*'],
          config['config/environments/*'],
          config['config/functions/*']
        );

        // Remove cache
        delete require.cache[path.resolve(strapi.config.appPath, 'package.json')];

        // Local `package.json`.
        const packageJSON = require(path.resolve(strapi.config.appPath, 'package.json'));

        // Merge default config and user loaded config together inside `strapi.config`.
        strapi.config = _.merge(strapi.config, mergedConfig, packageJSON);

        // Expose user APIs.
        strapi.api = config['api/**'];

        // Add user locales for the settings of the `i18n` hook
        // aiming to load locales automatically.
        if (_.isPlainObject(strapi.config.i18n) && !_.isEmpty(strapi.config.i18n)) {
          strapi.config.i18n.locales = [];
          _.forEach(config['config/locales/*'], function (strings, lang) {
            strapi.config.i18n.locales.push(lang);
          });
        }

        // Make sure the ORM config are equals to the databases file
        // (aiming to not have issue with adapters when rebuilding the dictionary).
        // It's kind of messy, for now, but it works fine. If someone has a better
        // solution we'd be glad to accept a Pull Request.
        if (!strapi.config.dry) {
          const ormConfig = JSON.parse(fs.readFileSync(path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments', strapi.config.environment, 'databases.json')));
          strapi.config.orm = ormConfig.orm;
        }

        // Save different environments because we need it in the Strapi Studio.
        strapi.config.environments = config['config/environments/**'] || {};

        // Make the application name in config match the server one.
        strapi.app.name = strapi.config.name;

        // Initialize empty API objects.
        strapi.controllers = {};
        strapi.models = {};
        strapi.policies = {};

        cb();
      });
    },

    /**
     * Reload the hook
     */

    reload: function () {
      hook.initialize(function (err) {
        if (err) {
          strapi.log.error('Failed to reinitialize the config hook.');
          strapi.stop();
        } else {
          strapi.emit('hook:_config:reloaded');
        }
      });
    }
  };

  return hook;
};
