'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const os = require('os');

// Public node modules.
const _ = require('lodash');

// Local dependencies.
const DEFAULT_HOOKS = require('./hooks/defaultHooks');

/**
 * Expose new instance of `Configuration`
 */

module.exports = function (strapi) {
  return new Configuration();

  function Configuration() {

    /**
     * Strapi default configuration
     *
     * @api private
     */

    this.defaults = function defaultConfig(appPath) {

      // If `appPath` not specified, unfortunately, this is a fatal error,
      // since reasonable defaults cannot be assumed.
      if (!appPath) {
        throw new Error('Error: No `appPath` specified!');
      }

      // Set up config defaults.
      return {

        // Core (default) hooks.
        hooks: _.reduce(DEFAULT_HOOKS, function (memo, hookBundled, hookIdentity) {
          memo[hookIdentity] = require('./hooks/' + hookIdentity);
          return memo;
        }, {}) || {},

        // Save `appPath` in implicit defaults.
        // `appPath` is passed from above in case `start` was used.
        // This is the directory where this Strapi process is being initiated from.
        // Usually this means `process.cwd()`.
        appPath: appPath,

        // Core settings non provided by hooks.
        host: process.env.HOST || process.env.HOSTNAME || strapi.config.host || 'localhost',
        port: process.env.PORT || strapi.config.port || 1337,

        // Make the environment in config match the server one.
        environment: strapi.app.env || process.env.NODE_ENV,

        // Default reload config.
        reload: {
          timeout: 1000,
          workers: os.cpus().length
        },

        // Application is not `dry` by default.
        dry: false,

        // Default paths.
        paths: {
          tmp: '.tmp',
          config: 'config',
          static: 'public',
          views: 'views',
          api: 'api',
          controllers: 'controllers',
          services: 'services',
          policies: 'policies',
          models: 'models',
          templates: 'templates'
        },

        // Start off needed empty objects and strings.
        routes: {},
        frontendUrl: ''
      };
    };

    /**
     * Load the configuration modules
     *
     * @api private
     */

    this.load = require('./load')(strapi);

    // Bind the context of all instance methods.
    _.bindAll(this);
  }
};
