'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const os = require('os');
const path = require('path');

// Local utilities.
const json = require('strapi-utils').json;

/**
 * Expose new instance of `Configuration`
 */

module.exports = class Configuration {

  /**
   * Strapi default configuration
   *
   * @api private
   */

  defaults(context, appPath) {

    // If `appPath` not specified, unfortunately, this is a fatal error,
    // since reasonable defaults cannot be assumed.
    if (!appPath) {
      throw new Error('Error: No `appPath` specified!');
    }

    // Set up config defaults.
    return {
      // Save `appPath` in implicit defaults.
      // `appPath` is passed from above in case `start` was used.
      // This is the directory where this Strapi process is being initiated from.
      // Usually this means `process.cwd()`.
      appPath,

      // Core settings non provided by hooks.
      host: process.env.HOST || process.env.HOSTNAME || context.config.host || 'localhost',
      port: process.env.PORT || context.config.port || 1337,

      // Make the environment in config match the server one.
      environment: context.app.env || process.env.NODE_ENV,

      // Default reload config.
      reload: {
        timeout: 1000,
        workers: os.cpus().length
      },

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
        plugins: 'plugins',
        validators: 'validators',
        admin: 'admin'
      },

      // Start off needed empty objects and strings.
      routes: {},
      collections: {},
      frontendUrl: '',
      hooks: {}
    };
  }

  /**
   * Load the configuration modules
   *
   * @api private
   */

  load(context, cb) {

    /**
     * Expose version/dependency info for the currently-running
     * Strapi on the `strapi` object (from its `package.json`).
     */

    const pathToThisVersionOfStrapi = path.join(__dirname, '..', '..');

    json.getPackage(pathToThisVersionOfStrapi, (err, pkg) => {
      if (err) {
        return cb(err);
      }

      context.version = pkg.version;
      context.dependencies = pkg.dependencies;

      // Override the previous contents of `strapi.config` with the new, validated
      // config with defaults and overrides mixed in the appropriate order.
      context.config = this.defaults(context, context.config.appPath || process.cwd());
      cb();
    });
  }
};
