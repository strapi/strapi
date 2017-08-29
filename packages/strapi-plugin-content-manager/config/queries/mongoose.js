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
    return await this
      .findOne({
        [this.primaryKey]: params.id
      });
  },

  create: async function (params) {
    return await this
      .create(params.values);
  },

  update: async function (params) {
    return await this
      .update({
        [this.primaryKey]: params.id
      }, params.values);
  },

  delete: async function (params) {
    return await this
      .destroy({
        [this.primaryKey]: params.id
      });
  }
};
