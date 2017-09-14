const _ = require('lodash');

module.exports = {
  find: async function (params) {
    return this
      .find()
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip));
  },

  count: async function (params) {
    return Number(await this
      .count());
  },

  findOne: async function (params) {
    return this
      .findOne({
        [this.primaryKey]: params.id
      })
      .populate(this.associations.map(x => x.alias).join(' '));
  },

  create: async function (params) {
    return await this
      .create(params.values);
  },

  update: async function (params) {
    return await this
      .update({
        [this.primaryKey]: params.id
      }, params.values, {
        strict: false
      });
  },

  delete: async function (params) {
    return await this
      .remove({
        [this.primaryKey]: params.id
      });
  },

  addRelation: async function (params) {
    return module.exports.update.call(this, params);
  },

  removeRelation: async function (params) {
    return module.exports.update.call(this, params);
  }
};
