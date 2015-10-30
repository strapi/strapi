'use strict';

/**
 * Destroy a specific entry.
 */

module.exports = function * () {
  try {
    const entry = yield strapi.hooks.blueprints.destroy(this);
    this.body = entry;
  } catch (err) {
    this.body = err;
  }
};
