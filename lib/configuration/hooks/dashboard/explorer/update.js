'use strict';

/**
 * Update a specific entry.
 */

module.exports = function * () {
  try {
    const entry = yield strapi.hooks.blueprints.update(this);
    this.body = entry;
  } catch (err) {
    this.body = err;
  }
};
