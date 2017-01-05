'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Local dependencies.
const Hook = require('../configuration/hooks');

/**
 * Resolve the hook definitions and then finish loading them
 *
 * @api private
 */

module.exports = function (cb) {
  function prepareHook(id) {
    let hookPrototype = this.hooks[id];

    // Handle folder-defined modules (default to `./lib/index.js`)
    // Since a hook definition must be a function.
    if (_.isObject(hookPrototype) && !_.isArray(hookPrototype) && !_.isFunction(hookPrototype)) {
      hookPrototype = hookPrototype.index;
    }

    if (!_.isFunction(hookPrototype)) {
      this.log.error('Malformed (`' + id + '`) hook (in `' + _.get(this.tree, id + '.category') + '`)!');
      this.log.error('Hooks should be a function with one argument (`strapi`)');
      this.stop();
    }

    // Instantiate the hook.
    const def = hookPrototype(this);

    // Mix in an `identity` property to hook definition.
    def.identity = id.toLowerCase();

    // If a config key was defined for this hook when it was loaded
    // (probably because a user is overridding the default config key),
    // set it on the hook definition.
    def.configKey = hookPrototype.configKey || def.identity;

    // New up an actual Hook instance.
    this.hooks[id] = new Hook(def);
  }

  // Function to apply a hook's `defaults` object or function.
  function applyDefaults(id, hook) {
    // Get the hook defaults.
    const defaults = (_.isFunction(hook.defaults) ? hook.defaults(_.get(this.config, 'hooks.' + id)) : hook.defaults) || {};
    // Get the current hook configuration
    const current = _.get(this.config, 'hooks.' + id);

    if (current === true) {
      // We cannot apply defaults where current configuration is a boolean.
      _.set(this.config, 'hooks.' + id, defaults);
    } else if (_.isPlainObject(current)) {
      _.defaultsDeep(_.get(this.config, 'hooks.' + id), defaults);
    }
  }

  // Load a hook and initialize it.
  function loadHook(id, cb) {
    let timeout = true;

    setTimeout(() => {
      if (timeout) {
        this.log.error('The hook `' + id + '` wasn\'t loaded (too long to load)(in `' + _.get(this.tree, id + '.category') + '`)!');
        process.nextTick(cb);
      }
    }, this.config.hookTimeout || 1000);

    this.hooks[id].load(err => {
      timeout = false;

      if (err) {
        this.log.error('The hook `' + id + '` failed to load (in `' + _.get(this.tree, id + '.category') + '`)!');
        this.emit('hook:' + id + ':error');
        return cb(err);
      }

      this.emit('hook:' + id + ':loaded');

      // Defer to next tick to allow other stuff to happen.
      process.nextTick(cb);
    });
  }

  async.series(_.map(this.hooks, (hook, identity) => {
    return cb => {
      prepareHook.apply(this, [identity]);
      applyDefaults.apply(this, [identity, hook(this)]);
      loadHook.apply(this, [identity, cb]);
    };
  }), err => cb(err));
};
