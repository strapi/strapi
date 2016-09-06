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
 * dictionary of the user config
 */

module.exports = strapi => {
  return {

    /**
     * Initialize the hook
     */

    initialize: cb => {
      async.auto({

        // Load common settings from `./config/*.js|json`.
        'config/*': cb => {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config),
            excludeDirs: /(locales|environments)$/,
            filter: /(.+)\.(js|json)$/,
            depth: 2
          }, cb);
        },

        // Load locales from `./config/locales/*.json`.
        'config/locales/*': cb => {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'locales'),
            filter: /(.+)\.(json)$/,
            identity: false,
            depth: 1
          }, cb);
        },

        // Load functions config from `./config/functions/*.js`.
        'config/functions/*': cb => {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'functions'),
            filter: /(.+)\.(js)$/,
            depth: 1
          }, cb);
        },

        // Load all environments config from `./config/environments/*/*.js|json`.
        // Not really used inside the framework but useful for the Studio.
        'config/environments/**': cb => {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments'),
            filter: /(.+)\.(js|json)$/,
            identity: false,
            depth: 4
          }, cb);
        },

        // Load environment-specific config from `./config/environments/**/*.js|json`.
        'config/environments/*': cb => {
          dictionary.aggregate({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'environments', strapi.config.environment),
            filter: /(.+)\.(js|json)$/,
            depth: 1
          }, cb);
        },

        // Load APIs from `./api/**/*.js|json`.
        'api/**': cb => {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.api),
            excludeDirs: /(public)$/,
            filter: /(.+)\.(js|json)$/,
            depth: 4
          }, cb);
        },

        // Load plugins from `./plugins/**/*.js|json`.
        'plugins/**': cb => {
          dictionary.optional({
            dirname: path.resolve(strapi.config.appPath, strapi.config.paths.plugins),
            excludeDirs: /(public)$/,
            filter: /(.+)\.(js|json)$/,
            depth: 4
          }, cb);
        }
      },

      // Callback.
      (err, config) => {

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

        // Remove cache.
        delete require.cache[path.resolve(strapi.config.appPath, 'package.json')];

        // Local `package.json`.
        const packageJSON = require(path.resolve(strapi.config.appPath, 'package.json'));

        // Merge default config and user loaded config together inside `strapi.config`.
        strapi.config = _.merge(strapi.config, mergedConfig, packageJSON);

        // Expose user APIs.
        strapi.api = config['api/**'];

        // Expose user plugins.
        strapi.plugins = config['plugins/**'];

        // Initialize plugin's routes.
        _.set(strapi.config, 'plugins.routes', {});

        // Add user locales for the settings of the `i18n` hook
        // aiming to load locales automatically.
        if (_.isPlainObject(strapi.config.i18n) && !_.isEmpty(strapi.config.i18n)) {
          strapi.config.i18n.locales = _.keys(config['config/locales/*']);
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
    }
  };
};
