'use strict';

/**
 * List every entries of a model.
 */

module.exports = function * () {
  try {
    const entry = yield strapi.hooks.blueprints.find(this);
    this.body = entry;
  } catch (err) {
    this.body = err;
  }
};
