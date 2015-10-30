'use strict';

/**
 * Create a new entry.
 */

module.exports = function * () {
  try {
    const entry = yield strapi.hooks.blueprints.create(this);
    this.body = entry;
  } catch (err) {
    this.body = err;
  }
};
