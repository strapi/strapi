/**
 * Count entries of a model.
 */

module.exports = function * () {
  const Model = strapi.hooks.blueprints.actionUtil.parseModel(this);
  const countQuery = Model.count().where(strapi.hooks.blueprints.actionUtil.parseCriteria(this));
  const count = yield countQuery;
  this.body = count;
};
