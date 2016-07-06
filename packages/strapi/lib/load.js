'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');
const herd = require('herd');

// Local dependencies.
const __Configuration = require('./configuration');
const __loadHooks = require('./private/loadHooks');

/**
 * Load the Strapi instance
 */

module.exports = strapi => {
  const Configuration = __Configuration(strapi);
  const loadHooks = __loadHooks(strapi);

  /**
   * Expose loader start point
   * (idempotent).
   *
   * @api public
   */

  return (configOverride, cb) => {
    if (strapi._exiting) {
      strapi.log.error('Cannot load or start an application after it has already been stopped.');
      process.exit(1);
    }

    // `configOverride` is optional.
    if (_.isFunction(configOverride)) {
      cb = configOverride;
      configOverride = {};
    }

    // Ensure override is an object and clone it (or make an empty object if it's not).
    configOverride = configOverride || {};
    strapi.config = _.cloneDeep(configOverride);

    // Optionally expose globals as soon as the
    // config hook is loaded.
    strapi.on('hook:_config:loaded', strapi.exposeGlobals);

    async.auto({
      // Apply core defaults and hook-agnostic configuration,
      // esp. overrides including command-line options, environment variables,
      // and options that were passed in programmatically.
      config: [Configuration.load],
      // Initiliaze hooks global variable and configurations
      hooks: ['config', initializeHooks],
      // Load core's hooks into memory, with their middleware and routes.
      dictionary: ['hooks', cb => loader('dictionary', cb)],
      // Load core's hooks into memory, with their middleware and routes.
      core: ['dictionary', cb => loader('core', cb)],
      // Load websocket's hooks into memory
      websocket: ['core', cb => loader('websockets', cb)],
      // Load models' hooks into memory
      models: ['websocket', cb => loader('models', cb)],
      // Load external hooks into memory
      external: ['models', cb => loader('external', cb)]
    }, ready__(cb));

    // Makes `app.load()` chainable.
    return strapi;
  };

  /**
   * Initiliaze hooks,
   * and put them back into `hooks` (probably `strapi.hooks`).
   *
   * @api private
   */

  function initializeHooks(cb) {
    strapi.hooks = {};

    if (strapi.config.hooks === false) {
      return cb();
    }

    // Mix in user-configured hook definitions.
    _.assign(strapi.hooks, strapi.config.hooks);

    return cb();
  }

  /**
   * Hook generic loader
   *
   * @api private
   */

  function loader(hookCategory, cb) {
    if (_.isEmpty(_.get(strapi.hooks, hookCategory))) {
      return cb();
    }

    loadHooks(_.get(strapi.hooks, hookCategory), hookCategory, cb);
  }

  /**
   * Returns function which is fired when Strapi is ready to go
   *
   * @api private
   */

  function ready__(cb) {
    strapi.emit('hooks:builtIn:ready');

    return err => {
      if (err) {
        // Displaying errors, try to start the server through
        strapi.log.error(err);
      }

      // Automatically define the server URL from
      // `proxy`, `ssl`, `host`, and `port` config.
      if (_.isString(strapi.config.proxy)) {
        strapi.config.url = strapi.config.proxy;
      } else {
        if (_.isPlainObject(strapi.config.ssl) && strapi.config.ssl.disabled === false) {
          strapi.config.url = 'https://' + strapi.config.host + ':' + strapi.config.port;
        } else {
          strapi.config.url = 'http://' + strapi.config.host + ':' + strapi.config.port;
        }
      }

      // We can finally make the server listen on the configured port.
      // Use of the `herd` node module to herd the child processes with
      // zero downtime reloads.
      if (_.isPlainObject(strapi.config.reload) && !_.isEmpty(strapi.config.reload) && strapi.config.reload.workers > 0) {
        herd(strapi.config.name)
          .close(function () {
            process.send('message');
          })
          .timeout(strapi.config.reload.timeout)
          .size(strapi.config.reload.workers)
          .run(function () {
            strapi.server.listen(strapi.config.port);
          });
      } else {
        strapi.server.listen(strapi.config.port);
      }

      cb && cb(null, strapi);
    };
  }
};
