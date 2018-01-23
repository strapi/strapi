const _ = require('lodash');

module.exports = {
  find: async function (params = {}, populate) {
    return this
      .find(params.where)
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip))
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  count: async function (params = {}) {
    return Number(await this
      .count(params));
  },

  findOne: async function (params, populate) {
    if (!params[this.primaryKey] && params.id) {
      params[this.primaryKey] = params.id;
      delete params.id;
    } else if (params.id) {
      delete params.id;
    }

    return this
      .findOne(params)
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  create: async function (params) {
    return this.create(Object.keys(params).reduce((acc, current) => {
      if (_.get(this._attributes, [current, 'type']) || _.get(this._attributes, [current, 'model'])) {
        acc[current] = params[current];
      }

      return acc;
    }, {}))
    .catch((error) => {
      const field = _.last(_.words(error.message.split('_')[0]));
      const err = { message: `This ${field} is already taken`, field };

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
      }
    }

    return this.update(search, params, {
      strict: false
    })
    .catch((error) => {
      const field = _.last(_.words(error.message.split('_')[0]));
      const err = { message: `This ${field} is already taken`, field };

      throw err;
    });
  },

  delete: async function (params) {
    // Delete entry.
    return this
      .remove({
        [this.primaryKey]: params[this.primaryKey] || params.id
      });
  },

  search: async function (params) {
    const re = new RegExp(params.id);

    return this
      .find({
        '$or': [
          { username: re },
          { email: re }
        ]
      });
  },

  addPermission: async function (params) {
    return this
      .create(params);
  },

  removePermission: async function (params) {
    return this
      .remove(params);
  }
};
