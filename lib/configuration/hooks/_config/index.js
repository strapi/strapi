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

        // Load common settings from `./config/*.json`.
        'config/*': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config),
            excludeDirs: /(locales|environments)$/,
            filter: /(.+)\.(json)$/,
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

        // Load environment-specific config from `./config/environments/**/*.json`.
        'config/environments/**': function (cb) {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments', strapi.config.environment),
            filter: /(.+)\.(json)$/,
            depth: 1
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
          config['config/environments/**'],
          config['config/functions/*']
        );

        // Local `package.json`.
        const packageJSON = require(path.resolve(strapi.config.appPath, 'package.json'));

        // Merge default config and user loaded config together inside `strapi.config`.
        strapi.config = _.merge(strapi.config, mergedConfig, packageJSON);

        // Add user locales for the settings of the `i18n` hook
        // aiming to load locales automatically.
        if (_.isPlainObject(strapi.config.i18n) && !_.isEmpty(strapi.config.i18n)) {
          strapi.config.i18n.locales = [];
          _.forEach(config['config/locales/*'], function (strings, lang) {
            strapi.config.i18n.locales.push(lang);
          });
        }

        // Save different environments inside an array because we need it in the Strapi dashboard.
        strapi.config.environments = fs.readdirSync(path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments'));

        // Make the application name in config match the server one.
        strapi.app.name = strapi.config.name;
      });

      cb();
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
