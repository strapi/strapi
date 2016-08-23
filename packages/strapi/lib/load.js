'use strict';

/**
 * Module dependencies
 */

 // Node.js core.
 const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');
const herd = require('herd');

// Local dependencies.
const Hook = require('./configuration/hooks');
const __Configuration = require('./configuration');
const __loadHooks = require('./private/loadHooks');
const DEFAULT_HOOKS = require('./configuration/hooks/defaultHooks');

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
  this.hooks = {};

  async.auto({
    // Apply core defaults and hook-agnostic configuration,
    // esp. overrides including command-line options, environment variables,
    // and options that were passed in programmatically.
    config: [Configuration.load],
    // Optionally expose globals as soon as the
    // config hook is loaded.
    exposeGlobals: ['config', (result, cb) => self.exposeGlobals(cb)],
    // Create configurations tree (dictionary).
    dictionary: ['exposeGlobals', (result, cb) => {
      // Pre-initialize hooks for create dictionary.
      _.assign(self.hooks, _.mapValues(_.get(DEFAULT_HOOKS, 'dictionary'), (hook, hookIdentity) => {
        return require('./configuration/hooks/dictionary/' + hookIdentity);
      }));

      loadHooks(self.hooks, cb);
    }],
    // Initialize hooks global variable and configurations
    initializeHooks: ['dictionary', initializeHooks],
    // Load hooks into memory.
    loadHooks: ['initializeHooks', (result, cb) => loadHooks(self.hooks, cb)]
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
    // Reset
    self.hooks = {};

    const tree = {};

    // Create a tree of hook's path.
    _.forEach(_.omit(DEFAULT_HOOKS, 'dictionary'), (hooks, hookCategory) => {
      _.forEach(hooks, (hook, hookIdentity) => {
         _.set(tree, hookIdentity, './configuration/hooks/' + hookCategory + '/' + hookIdentity);
      });
    });

    // Extend tree with external hooks.
    _.forEach(self.externalHooks, (hook, hookIdentity) => {
      _.set(tree, hookIdentity, hook);
    });

    // Remove this sensitive object.
    delete strapi.externalHooks;

    const mapper = _.clone(self.config.hooks);

    // Map (warning: we could have some order issues).
    _.assignWith(mapper, tree, (objValue, srcValue) => {
      return objValue === false ? objValue : true;
    });

    // Pick hook to load.
    self.hooks = _.pickBy(mapper, value => value !== false);

    // Require only necessary hooks.
    self.hooks =_.mapValues(self.hooks, (hook, hookIdentity) => {
      try {
        return require(_.get(tree, hookIdentity));
      } catch (err) {
        try {
          return require(path.resolve(self.config.appPath, 'node_modules', hookIdentity));
        } catch (err) {
          cb(err);
        }
      }
    });

    return cb();
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
