module.exports = {
  find: async function (params) {
    return await this
      .forge()
      .fetchAll({
        withRelated: this.associations.map(x => x.alias).join(' ')
      });
  },

  count: async function (params) {
    return await this
      .forge()
      .count();
  },

  findOne: async function (params) {
    return await this
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .fetch();
  },

  create: async function (params) {
    return await this
      .forge()
      .save(params.values);
  },

  update: async function (params) {
    return await this
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .save(params.values, {
        patch: true
      });
  },

  delete: async function (params) {
    return await params.model
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .destroy();
  }
};
