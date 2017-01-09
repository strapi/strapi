'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Expose the strategy to load
 * built-in hooks
 */

module.exports = class Hook {

  constructor(definition) {

    /**
     * Default configuration for this hook
     * (should be overriden by hook definition)
     *
     * @return {}
     */

    this.defaults = {};
    this.config = {
      environments: {}
    };

    // Merge default definition with overrides in the definition passed in.
    _.assign(this, definition);
  }

  initialize(cb) {
    return cb();
  }

  load(cb) {
    // Determine if this hook should load based on
    // Strapi environment and hook config.
    if (this.config.environments &&
      _.size(this.config.environments) > 0 &&
      _.indexOf(this.config.environments, process.env.NODE_ENV) === -1) {
      return cb();
    }

    this.initialize(cb);
  }
};
