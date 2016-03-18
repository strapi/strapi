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
const __initializeHooks = require('./private/loadHooks');

/**
 * Load the Strapi instance
 */

module.exports = strapi => {
  const Configuration = __Configuration(strapi);
  const initializeHooks = __initializeHooks(strapi);

  /**
   * Expose loader start point
   * (idempotent).
   *
   * @api public
   */

  return function load(configOverride, cb) {
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

      // Load hooks into memory, with their middleware and routes.
      hooks: ['config', loadHooks]
    }, ready__(cb));

    // Makes `app.load()` chainable.
    return strapi;
  };

  /**
   * Load hooks in parallel
   * let them work out dependencies themselves,
   * taking advantage of events fired from the `strapi` object.
   *
   * @api private
   */

  function loadHooks(cb) {
    strapi.hooks = {};

    // If `strapi.config.hooks` is disabled, skip hook loading altogether.
    if (strapi.config.hooks === false) {
      return cb();
    }

    async.series([
      cb => loadHookDefinitions(strapi.hooks, cb),
      cb => initializeHooks(strapi.hooks, cb)
    ], err => {
      if (err) {
        return cb(err);
      }

      // Inform any listeners that the initial, built-in hooks
      // are finished loading.
      strapi.emit('hooks:builtIn:ready');
      return cb();
    });
  }

  /**
   * Load built-in hook definitions from `strapi.config.hooks`
   * and put them back into `hooks` (probably `strapi.hooks`)
   *
   * @api private
   */

  function loadHookDefinitions(hooks, cb) {

    // Mix in user-configured hook definitions.
    _.assign(hooks, strapi.config.hooks);

    return cb();
  }

  /**
   * Returns function which is fired when Strapi is ready to go
   *
   * @api private
   */

  function ready__(cb) {
    return function (err) {
      if (err) {
        return cb && cb(err);
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
            strapi.app.listen(strapi.config.port);
          });
      } else {
        strapi.app.listen(strapi.config.port);
      }

      cb && cb(null, strapi);
    };
  }
};
