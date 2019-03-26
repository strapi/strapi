const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = {
  find: async function(params, populate) {
    const model = this;
    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters,
      populate: populate || model.associations.map(x => x.alias),
    }).lean();
  },

  count: async function(params) {
    const model = this;

    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters: { where: filters.where },
    }).count();
  },

  findOne: async function(params, populate) {
    const primaryKey = params[this.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [this.primaryKey]: primaryKey,
      };
    }

    return this.findOne(params)
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  create: async function(params) {
    return this.create(
      Object.keys(params).reduce((acc, current) => {
        if (
          _.get(this._attributes, [current, 'type']) ||
          _.get(this._attributes, [current, 'model'])
        ) {
          acc[current] = params[current];
        }

        return acc;
      }, {})
    ).catch(err => {
      if (err.message.indexOf('index:') !== -1) {
        const message = err.message.split('index:');
        const field = _.words(_.last(message).split('_')[0]);
        const error = { message: `This ${field} is already taken`, field };

        throw error;
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
    }

    return this.updateOne(search, params, {
      strict: false,
    }).catch(error => {
      const field = _.last(_.words(error.message.split('_')[0]));
      const err = { message: `This ${field} is already taken`, field };

      throw err;
    });
  },

  delete: async function(params) {
    // Delete entry.
    return this.deleteOne({
      [this.primaryKey]: params[this.primaryKey] || params.id,
    });
  },

  deleteMany: async function(params) {
    // Delete entry.
    return this.deleteMany({
      [this.primaryKey]: {
        $in: params[this.primaryKey] || params.id,
      },
    });
  },

  search: async function(params) {
    const re = new RegExp(params.id);

    return this.find({
      $or: [{ username: re }, { email: re }],
    });
  },

  addPermission: async function(params) {
    return this.create(params);
  },

  removePermission: async function(params) {
    return this.remove(params);
  },
};
