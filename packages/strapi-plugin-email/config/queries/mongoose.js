const _ = require('lodash');

module.exports = {
  find: async function (params = {}, populate) {
    return this
      .find(params.where)
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.start))
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  count: async function (params = {}) {
    return Number(await this
      .countDocuments(params));
  },

  findOne: async function (params, populate) {
    const primaryKey = params[this.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [this.primaryKey]: primaryKey
      };
    }

    return this
      .findOne(params)
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  create: async function (params) {
    // Exclude relationships.
    const values = Object.keys(params).reduce((acc, current) => {
      if (_.get(this._attributes, [current, 'type']) || _.get(this._attributes, [current, 'model'])) {
        acc[current] = params[current];
      }

      return acc;
    }, {});

    return this.create(values)
      .catch((err) => {
        if (err.message.indexOf('index:') !== -1) {
          const message = err.message.split('index:');
          const field = _.words(_.last(message).split('_')[0]);
          const error = { message: `This ${field} is already taken`, field };

          throw error;
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
    }

    return this.updateOne(search, params, {
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
      .deleteOne({
        [this.primaryKey]: params[this.primaryKey] || params.id
      });
  },

  search: async function (params) {
    const re = new RegExp(params.id, 'i');

    return this
      .find({
        '$or': [
          { hash: re },
          { name: re }
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
