'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');

/**
 * Expose the strategy to load
 * built-in hooks
 */

module.exports = function (strapi) {

  /**
   * Expose hook constructor
   *
   * @api private
   */

  return Hook;

  function Hook(definition) {

    /**
     * Load the hook asynchronously
     *
     * @api private
     */

    this.load = function (cb) {
      const self = this;

      // Determine if this hook should load based on
      // Strapi environment and hook config.
      if (this.config.environments &&
        _.size(this.config.environments) > 0 &&
        _.indexOf(this.config.environments, strapi.config.environment) === -1) {
        return cb();
      }

      // Run `loadModules` method if it is loaded.
      async.auto({
        modules: function loadModules(cb) {
          return cb();
        }
      }, function (err) {
        if (err) {
          return cb(err);
        }
        self.initialize(cb);
      });
    };

    /**
     * Default configuration for this hook
     * (should be overiden by hook definition)
     *
     * @return {}
     */

    this.defaults = function () {
      return {};
    };

    /**
     * Hooks may override this function
     */

    this.initialize = function (cb) {
      return cb();
    };

    // Ensure that the hook definition has valid properties.
    _normalize(this);
    definition = _normalize(definition);

    // Merge default definition with overrides in the definition passed in.
    _.assign(definition.config, this.config, definition.config);
    _.assign(this, definition);

    // Bind context of new methods from definition.
    _.bindAll(this);

    /**
     * Ensure that a hook definition has the required properties
     *
     * @api private
     */

    function _normalize(def) {
      def = def || {};

      // Default hook config.
      def.config = def.config || {};

      // List of environments to run in, if empty defaults to all.
      def.config.environments = def.config.environments || {};

      return def;
    }
  }
};
