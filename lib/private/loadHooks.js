'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');

// Local dependencies.
const __hooks = require('../configuration/hooks');

/**
 * Resolve the hook definitions and then finish loading them
 *
 * @api private
 */

module.exports = function (strapi) {
  const Hook = __hooks(strapi);

  return function initializeHooks(hooks, cb) {
    function prepareHook(id) {
      let hookPrototype = hooks[id];

      // Allow disabling of hooks by setting them to `false`.
      if (strapi.config.hooks[hookPrototype] === false) {
        delete hooks[id];
        return;
      }

      // Handle folder-defined modules (default to `lib/index.js`)
      // Since a hook definition must be a function.
      if (_.isObject(hookPrototype) && !_.isArray(hookPrototype) && !_.isFunction(hookPrototype)) {
        hookPrototype = hookPrototype.index;
      }

      if (!_.isFunction(hookPrototype)) {
        strapi.log.error('Malformed (`' + id + '`) hook!');
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
      hooks[id] = new Hook(def);
    }

    // Function to apply a hook's `defaults` object or function.
    function applyDefaults(hook) {

      // Get the hook defaults.
      const defaults = (_.isFunction(hook.defaults) ? hook.defaults(strapi.config) : hook.defaults) || {};
      _.defaults(strapi.config, defaults);
    }

    // Load a hook and initialize it.
    function loadHook(id, cb) {
      const timeoutInterval = 5000;
      let hookTimeout;

      hookTimeout = setTimeout(function tooLong() {
        const hooksTookTooLongErr = 'The hook `' + id + '` is taking too long to load.';
        const err = new Error(hooksTookTooLongErr);
        err.code = 'E_HOOK_TIMEOUT';
        cb(err);
      }, timeoutInterval);

      hooks[id].load(function (err) {
        clearTimeout(hookTimeout);
        if (err) {
          strapi.log.error('`' + id + '` failed to load!');
          strapi.emit('hook:' + id + ':error');
          return cb(err);
        }

        strapi.emit('hook:' + id + ':loaded');

        // Defer to next tick to allow other stuff to happen.
        process.nextTick(cb);
      });
    }

    async.series({

      // Load the user config dictionary.
      _config: function loadConfigHook(cb) {
        if (!hooks._config) {
          return cb();
        }
        prepareHook('_config');
        applyDefaults(hooks._config);
        loadHook('_config', cb);
      },

      // Load the user APIs dictionary.
      _api: function loadApiHook(cb) {
        if (!hooks._api) {
          return cb();
        }
        prepareHook('_api');
        applyDefaults(hooks._api);
        loadHook('_api', cb);
      },

      // Prepare all other hooks.
      prepare: function prepareHooks(cb) {
        async.each(_.without(_.keys(hooks), '_config', '_api'), function (id, cb) {
          prepareHook(id);
          process.nextTick(cb);
        }, cb);
      },

      // Apply the default config for all other hooks.
      defaults: function defaultConfigHooks(cb) {
        async.each(_.without(_.keys(hooks), '_config', '_api'), function (id, cb) {
          const hook = hooks[id];
          applyDefaults(hook);
          process.nextTick(cb);
        }, cb);
      },

      // Load all other hooks.
      load: function loadOtherHooks(cb) {
        async.each(_.without(_.keys(hooks), '_config', '_api'), function (id, cb) {
          loadHook(id, cb);
        }, cb);
      }
    },

    function hooksReady(err) {
      return cb(err);
    });
  };
};
