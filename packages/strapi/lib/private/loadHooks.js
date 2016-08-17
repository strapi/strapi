'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');
const cluster = require('cluster');

// Local dependencies.
const Hook = require('../configuration/hooks');

/**
 * Resolve the hook definitions and then finish loading them
 *
 * @api private
 */

module.exports = function (strapi) {
  return (hooks, hookCategory, cb) => {

    function prepareHook(id) {
      let hookPrototype = hooks[id];

      // Handle folder-defined modules (default to `./lib/index.js`)
      // Since a hook definition must be a function.
      if (_.isObject(hookPrototype) && !_.isArray(hookPrototype) && !_.isFunction(hookPrototype)) {
        hookPrototype = hookPrototype.index;
      }

      if (!_.isFunction(hookPrototype)) {
        strapi.log.error('Malformed (`' + id + '`) hook (in `' + hookCategory + '`)!');
        strapi.log.error('Hooks should be a function with one argument (`strapi`)');
        strapi.stop();
      }

      // Instantiate the hook.
      const def = hookPrototype(strapi);

      // Mix in an `identity` property to hook definition.
      def.identity = id.toLowerCase();

      // If a config key was defined for this hook when it was loaded
      // (probably because a user is overridding the default config key),
      // set it on the hook definition.
      def.configKey = hookPrototype.configKey || def.identity;

      // New up an actual Hook instance.
      hooks[id] = new Hook(strapi, def);
    }

    // Function to apply a hook's `defaults` object or function.
    function applyDefaults(hook) {
      // Get the hook defaults.
      const defaults = (_.isFunction(hook.defaults) ? hook.defaults(strapi.config) : hook.defaults) || {};

      _.defaultsDeep(strapi.config, defaults);
    }

    // Load a hook and initialize it.
    function loadHook(id, cb) {
      let timeout = true;

      setTimeout(() => {
        if (timeout) {
          strapi.log.error('The hook `' + id + '` wasn\'t loaded (too long to load)(in `' + hookCategory + '`)!');
          process.nextTick(cb);
        }
      }, strapi.config.hookTimeout || 1000);

      hooks[id].load(err => {
        timeout = false;

        if (err) {
          strapi.log.error('The hook `' + id + '` failed to load (in `' + hookCategory + '`)!');
          strapi.emit('hook:' + id + ':error');
          return cb(err);
        }

        strapi.emit('hook:' + id + ':loaded');

        // Defer to next tick to allow other stuff to happen.
        process.nextTick(cb);
      });
    }

    async.series(_.map(hooks, (hook, identity) => {
      // Don't load disabled hook
      if (_.get(strapi.config.hooks[hookCategory], identity) === false) {
        return cb => {
          cb();
        };
      }

      return cb => {
        prepareHook(identity);
        applyDefaults(hook);
        loadHook(identity, cb);
      }
    }), err => cb(err));
  };
};
