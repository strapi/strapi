const _ = require('lodash');

module.exports = {
  find: async function (params) {
    return this.query(function(qb) {
      _.forEach(params.where, (where, key) => {
        qb.where(key, where[0].symbol, where[0].value);
      });

      if (params.sort) {
        qb.orderBy(params.sort);
      }

      qb.offset(params.start);

      qb.limit(params.limit);
    }).fetchAll({
      withRelated: _.keys(_.groupBy(_.reject(this.associations, {autoPopulate: false}), 'alias'))
    });
  },

  count: async function (params) {
    return await this
      .forge()
      .count();
  },

  findOne: async function (params) {
    if (_.get(params, '_id')) {
      params.id = params._id;
      delete params._id;
    }

    const record = await this
      .forge(params)
      .fetch({
        withRelated: this.associations.map(x => x.alias)
      });

    return record ? record.toJSON() : record;
  },

  create: async function (params) {
    return this
      .forge()
      .save(Object.keys(params).reduce((acc, current) => {
      if (_.get(this, ['_attributes', current, 'type'])) {
        acc[current] = params[current];
      }

      return acc;
    }, {}))
    .catch((err) => {
      if (err.detail) {
        const field = _.last(_.words(err.detail.split('=')[0]));
        err = { message: `This ${field} is already taken`, field };
      }

      throw err;
    });
  },

  update: async function (params) {
    if (_.get(params, '_id')) {
      params.id = params._id;
      delete params._id;
    }

    return this.forge({
      [this.primaryKey]: params[this.primaryKey]
    })
    .save(params, {
      patch: true
    })
    .catch((err) => {
      const field = _.last(_.words(err.detail.split('=')[0]));
      const error = { message: `This ${field} is already taken`, field };

      throw error;
    });
  },

  delete: async function (params) {
    return await this
      .forge({
        [this.primaryKey]: params._id
      })
      .destroy();
  },

  search: async function (params) {
    return this
      .query(function(qb) {
        qb
        .where('username', 'LIKE', `%${params.id}%`)
        .orWhere('email', 'LIKE', `%${params.id}%`);
      })
      .fetchAll();
  },

  countByRoles: async function () {
    const result = await strapi.connections[this.connection].raw(`SELECT COUNT("id") AS total, "role" FROM "${strapi.plugins['users-permissions'].models.user.collectionName}" GROUP BY "role";`);
    return result.rows.reduce((acc, current) => {
      acc.push({
        _id: parseFloat(current.role),
        total: parseFloat(current.total)
      });

      return acc;
    }, []);
  }
};
