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

module.exports = function (configOverride, cb) {
  const self = this;

  const Configuration = __Configuration(this);
  const loadHooks = __loadHooks(this);

  if (this._exiting) {
    this.log.error('Cannot load or start an application after it has already been stopped.');
    process.exit(1);
  }

  // `configOverride` is optional.
  if (_.isFunction(configOverride)) {
    cb = configOverride;
    configOverride = {};
  }

  // Ensure override is an object and clone it (or make an empty object if it's not).
  configOverride = configOverride || {};
  this.config = _.cloneDeep(configOverride);

  async.auto({
    // Apply core defaults and hook-agnostic configuration,
    // esp. overrides including command-line options, environment variables,
    // and options that were passed in programmatically.
    config: [Configuration.load],
    // Optionally expose globals as soon as the
    // config hook is loaded.
    exposeGlobals: ['config', (result, cb) => self.exposeGlobals(cb)],
    // Initiliaze hooks global variable and configurations
    hooks: ['exposeGlobals', initializeHooks],
    // Load core's hooks into memory, with their middleware and routes.
    dictionary: ['hooks', (result, cb) => loader('dictionary', cb)],
    // Load core's hooks into memory, with their middleware and routes.
    core: ['dictionary', (result, cb) => loader('core', cb)],
    // Load websocket's hooks into memory
    websocket: ['core', (result, cb) => loader('websockets', cb)],
    // Load models' hooks into memory
    models: ['websocket', (result, cb) => loader('models', cb)],
    // Load external hooks into memory
    external: ['models', (result, cb) => loader('external', cb)]
  }, ready__(cb));

  // Makes `app.load()` chainable.
  return self;

  /**
   * Initiliaze hooks,
   * and put them back into `hooks` (probably `strapi.hooks`).
   *
   * @api private
   */

  function initializeHooks(result, cb) {
    self.hooks = {};

    if (self.config.hooks === false) {
      return cb();
    }

    // Mix in user-configured hook definitions.
    _.assign(self.hooks, self.config.hooks);

    return cb();
  }

  /**
   * Hook generic loader
   *
   * @api private
   */

  function loader(hookCategory, cb) {
    if (_.isEmpty(_.get(self.hooks, hookCategory))) {
      return cb();
    }

    loadHooks(_.get(self.hooks, hookCategory), hookCategory, cb);
  }

  /**
   * Returns function which is fired when Strapi is ready to go
   *
   * @api private
   */

  function ready__(cb) {
    self.emit('hooks:builtIn:ready');

    return err => {
      if (err) {
        // Displaying errors, try to start the server through
        self.log.error(err);
      }

      // Automatically define the server URL from
      // `proxy`, `ssl`, `host`, and `port` config.
      if (_.isString(self.config.proxy)) {
        self.config.url = self.config.proxy;
      } else {
        if (_.isPlainObject(self.config.ssl) && self.config.ssl.disabled === false) {
          self.config.url = 'https://' + self.config.host + ':' + self.config.port;
        } else {
          self.config.url = 'http://' + self.config.host + ':' + self.config.port;
        }
      }

      // We can finally make the server listen on the configured port.
      // Use of the `herd` node module to herd the child processes with
      // zero downtime reloads.
      if (_.isPlainObject(self.config.reload) && !_.isEmpty(self.config.reload) && self.config.reload.workers > 0) {
        herd(self.config.name)
          .close(function () {
            process.send('message');
          })
          .timeout(self.config.reload.timeout)
          .size(self.config.reload.workers)
          .run(function () {
            self.server.listen(self.config.port);
          });
      } else {
        self.server.listen(self.config.port);
      }

      cb && cb(null, self);
    };
  }
};
