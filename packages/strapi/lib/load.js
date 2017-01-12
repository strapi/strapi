'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Local dependencies.
const Configuration = require('./configuration');
const loadHooks = require('./private/loadHooks');
const DEFAULT_HOOKS = require('./configuration/hooks/defaultHooks');

/**
 * Load the Strapi instance
 */

module.exports = function (configOverride, cb) {
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
    config: cb => new Configuration().load(this, cb),
    // Optionally expose globals as soon as the
    // config hook is loaded.
    exposeGlobals: ['config', (result, cb) => this.exposeGlobals(cb)],
    // Initialize dictionary's hooks.
    preInitializeHooks: ['exposeGlobals', (result, cb) => preInitializeHooks.apply(this, [cb])],
    // Create configurations tree (dictionary).
    loadDictionary: ['preInitializeHooks', (result, cb) => loadHooks.apply(this, [cb])],
    // Initialize hooks left.
    initializeHooks: ['loadDictionary', (result, cb) => initializeHooks.apply(this, [cb])],
    // Load hooks into memory.
    loadHooks: ['initializeHooks', (result, cb) => loadHooks.apply(this, [cb])]
  }, (err) => {
    if (err) {
      const hooksLoaded = _.keys(_.mapKeys(this.warmEvents, (value, key) => {
        if (key.indexOf('hook:') !== -1) {
          return key.split(':')[1];
        }
      }));

      this.log.error(err);
      this.log.debug('The hooks (' + hooksLoaded.join(', ') + ') are loaded, though.');
    }

    ready__.apply(this, [cb])();
  });

  // Makes `app.load()` chainable.
  return this;

  /**
   * Pre-initialize hooks by putting only dictionary hooks,
   * into the `hooks` global varialbe.
   *
   * @api private
   */

  function preInitializeHooks(cb) {
    // Pre-initialize hooks for create dictionary.
    _.assign(this.hooks, _.mapValues(_.get(DEFAULT_HOOKS, 'dictionary'), (hook, hookIdentity) => {
      return require('./configuration/hooks/dictionary/' + hookIdentity);
    }));

    cb();
  }

  /**
   * Initiliaze hooks,
   * and put them back into `hooks` (probably `strapi.hooks`).
   *
   * @api private
   */

  function initializeHooks(cb) {
    // Reset
    this.hooks = {};
    this.tree = {};

    // Create a tree of hook's path.
    _.forEach(_.omit(DEFAULT_HOOKS, 'dictionary'), (hooks, hookCategory) => {
      _.forEach(hooks, (hook, hookIdentity) => {
        _.set(this.tree, hookIdentity, {
          path: './configuration/hooks/' + hookCategory + '/' + hookIdentity,
          category: hookCategory
        });
      });
    });

    // Extend tree with external hooks.
    _.forEach(this.externalHooks, (hook, hookIdentity) => {
      _.set(this.tree, hookIdentity, {
        path: hook,
        category: 'external'
      });
    });

    // Remove this sensitive object.
    delete this.externalHooks;

    const mapper = _.clone(this.config.hooks);

    // Map (warning: we could have some order issues).
    _.assignWith(mapper, this.tree, (objValue) => {
      if (_.isPlainObject(objValue)) {
        return true;
      }

      return _.isBoolean(objValue) ? objValue : false;
    });

    // Pick hook to load.
    this.hooks = _.pickBy(mapper, value => value === true);

    // Require only necessary hooks.
    this.hooks = _.mapValues(this.hooks, (hook, hookIdentity) => {
      if (_.isEmpty(_.get(this.tree, hookIdentity + '.path'))) {
        return cb(`The hook strapi-${hookIdentity} cannot be found. Try to run \`npm install strapi-${hookIdentity}\`.`);
      }

      try {
        return require(_.get(this.tree, hookIdentity + '.path'));
      } catch (err) {
        try {
          return require(path.resolve(this.config.appPath, 'node_modules', _.get(this.tree, hookIdentity + '.path')));
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
    this.emit('hooks:builtIn:ready');

    // Remove sensitive object.
    delete this.tree;

    return err => {
      if (err) {
        // Displaying errors, try to start the server through
        this.log.error(err);
      }

      // Automatically define the server URL from
      // `proxy`, `ssl`, `host`, and `port` config.
      if (_.isString(this.config.proxy)) {
        this.config.url = this.config.proxy;
      } else {
        if (_.isPlainObject(this.config.ssl) && this.config.ssl.disabled === false) {
          this.config.url = 'https://' + this.config.host + ':' + this.config.port;
        } else {
          this.config.url = 'http://' + this.config.host + ':' + this.config.port;
        }
      }

      // We can finally make the server listen on the configured port.
      this.server.listen(this.config.port);

      cb && cb(null, this);
    };
  }
};
