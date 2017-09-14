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
    const record = await this
      .forge({
        [this.primaryKey]: params[this.primaryKey]
      })
      .fetch({
        withRelated: this.associations.map(x => x.alias).join(' ')
      });

    return record ? record.toJSON() : record;
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
  },

  addRelation: async function (params) {
    const association = this.associations.filter(x => x.via === params.foreignKey)[0];

    if (!association) {
      // Resolve silently.
      return Promise.resolve();
    }

    switch (association.nature) {
      case 'oneToOne':
      case 'oneToMany':
        return module.exports.update.call(this, params);
      case 'manyToMany':
        return this.forge({
          [this.primaryKey]: params[this.primaryKey]
        })[association.alias]().attach(params.values.id);
      default:
        // Resolve silently.
        return Promise.resolve();
    }
  },

  removeRelation: async function (params) {
    const association = this.associations.filter(x => x.via === params.foreignKey)[0];

    if (!association) {
      // Resolve silently.
      return Promise.resolve();
    }

    switch (association.nature) {
      case 'oneToOne':
      case 'oneToMany':
        return module.exports.update.call(this, params);
      case 'manyToMany':
        return this.forge({
          [this.primaryKey]: params[this.primaryKey]
        })[association.alias]().detach(params.values.id);
      default:
        // Resolve silently.
        return Promise.resolve();
    }
  }
};
