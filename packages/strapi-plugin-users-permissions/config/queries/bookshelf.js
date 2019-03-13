const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = {
  find: async function(params, populate) {
    const model = this;

    const filters = convertRestQueryParams(params);

    return this.query(buildQuery({ model, filters }))
      .fetchAll({
        withRelated: populate || this.associations.map(x => x.alias),
      })
      .then(data => data.toJSON());
  },

  count: async function(params = {}) {
    const model = this;

    const { where } = convertRestQueryParams(params);

    return this.query(buildQuery({ model, filters: { where } })).count();
  },

  findOne: async function(params, populate) {
    const primaryKey = params[this.primaryKey] || params._id;

    if (primaryKey) {
      params = {
        [this.primaryKey]: primaryKey,
      };
    }

    const record = await this.forge(params).fetch({
      withRelated: populate || this.associations.map(x => x.alias),
    });

    return record ? record.toJSON() : record;
  },

  create: async function(params) {
    return this.forge()
      .save(
        Object.keys(params).reduce((acc, current) => {
          if (
            _.get(this._attributes, [current, 'type']) ||
            _.get(this._attributes, [current, 'model'])
          ) {
            acc[current] = params[current];
          }

          return acc;
        }, {})
      )
      .catch(err => {
        if (err.detail) {
          const field = _.last(_.words(err.detail.split('=')[0]));
          err = { message: `This ${field} is already taken`, field };
        }

        throw err;
      });
  },

  update: async function(search, params = {}) {
    if (_.isEmpty(params)) {
      params = search;
    }

    const primaryKey = search[this.primaryKey] || search.id;

    if (primaryKey) {
      search = {
        [this.primaryKey]: primaryKey,
      };
    } else {
      const entry = await module.exports.findOne.call(this, search);

      search = {
        [this.primaryKey]: entry[this.primaryKey] || entry.id,
      };
    }

    return this.forge(search)
      .save(params, {
        patch: true,
      })
      .catch(err => {
        const field = _.last(_.words(err.detail.split('=')[0]));
        const error = { message: `This ${field} is already taken`, field };

        throw error;
      });
  },

  delete: async function(params) {
    return await this.forge({
      [this.primaryKey]: params[this.primaryKey] || params.id,
    }).destroy();
  },

  deleteMany: async function(params) {
    return await this.query(qb => {
      qb.whereIn(this.primaryKey, params[this.primaryKey] || params.id);
    }).destroy();
  },

  search: async function(params) {
    return this.query(function(qb) {
      qb.where('username', 'LIKE', `%${params.id}%`).orWhere('email', 'LIKE', `%${params.id}%`);
    }).fetchAll();
  },

  addPermission: async function(params) {
    return this.forge(params).save();
  },

  removePermission: async function(params) {
    const value = params[this.primaryKey]
      ? {
        [this.primaryKey]: params[this.primaryKey] || params.id,
      }
      : params;

    return this.forge()
      .where(value)
      .destroy();
  },
};
