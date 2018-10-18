const _ = require('lodash');

module.exports = {
  find: async function (params = {}, populate) {
    const records = await this.query(function(qb) {
      _.forEach(params.where, (where, key) => {
        if (_.isArray(where.value)) {
          for (const value in where.value) {
            qb[value ? 'where' : 'orWhere'](key, where.symbol, where.value[value]);
          }
        } else {
          qb.where(key, where.symbol, where.value);
        }
      });

      if (params.start) {
        qb.offset(params.start);
      }

      if (params.limit) {
        qb.limit(params.limit);
      }

      if (params.sort) {
        if (params.sort.key) {
          qb.orderBy(params.sort.key, params.sort.order);
        } else {
          qb.orderBy(params.sort);
        }
      }
    })
      .fetchAll({
        withRelated: populate || _.keys(_.groupBy(_.reject(this.associations, { autoPopulate: false }), 'alias'))
      });


    return records ? records.toJSON() : records;
  },

  count: async function (params = {}) {
    return await this
      .forge() // Instanciate the model
      .query(qb => {
        _.forEach(params.where, (where, key) => {
          if (_.isArray(where.value)) {
            for (const value in where.value) {
              qb[value ? 'where' : 'orWhere'](key, where.symbol, where.value[value]);
            }
          } else {
            qb.where(key, where.symbol, where.value);
          }
        });
      })
      .count();
  },

  findOne: async function (params, populate) {
    const primaryKey = params[this.primaryKey] || params._id;

    if (primaryKey) {
      params = {
        [this.primaryKey]: primaryKey
      };
    }

    const record = await this
      .forge(params)
      .fetch({
        withRelated: populate || this.associations.map(x => x.alias)
      });

    return record ? record.toJSON() : record;
  },

  create: async function (params) {
    return this
      .forge()
      .save(Object.keys(params).reduce((acc, current) => {
        if (_.get(this._attributes, [current, 'type']) || _.get(this._attributes, [current, 'model'])) {
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

  update: async function (search, params = {}) {
    if (_.isEmpty(params)) {
      params = search;
    }

    const primaryKey = search[this.primaryKey] || search.id;

    if (primaryKey) {
      search = {
        [this.primaryKey]: primaryKey
      };
    } else {
      const entry = await module.exports.findOne.call(this, search);

      search = {
        [this.primaryKey]: entry[this.primaryKey] || entry.id
      };
    }

    return this.forge(search)
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
        [this.primaryKey]: params[this.primaryKey] || params.id
      })
      .destroy();
  },

  deleteMany: async function (params) {
    return await this
      .query(qb => {
        qb.whereIn(this.primaryKey, params[this.primaryKey] || params.id);
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

  addPermission: async function (params) {
    return this
      .forge(params)
      .save();
  },

  removePermission: async function (params) {
    const value = params[this.primaryKey] ? {
      [this.primaryKey]: params[this.primaryKey] || params.id
    } : params;

    return this
      .forge()
      .where(value)
      .destroy();
  }
};
