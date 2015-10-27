/**
 * Show a specific entry.
 */

module.exports = function * () {
  try {
    const entry = yield strapi.hooks.blueprints.findOne(this);
    this.body = entry;
  } catch (err) {
    this.body = err;
  }
};
