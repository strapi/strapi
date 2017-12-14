const _ = require('lodash');

module.exports = {
  find: async function (params) {
    return this
      .find(params.where)
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip))
      .populate(this.associations.map(x => x.alias).join(' '));
  },

  count: async function (params) {
    return Number(await this
      .count());
  },

  findOne: async function (params) {
    if (!params[this.primaryKey] && params.id) {
      params[this.primaryKey] = params.id;
      delete params.id;
    } else if (params.id) {
      delete params.id;
    }

    return this
      .findOne(params)
      .populate(this.associations.map(x => x.alias).join(' '));
  },

  create: async function (params) {
    return this.create(Object.keys(params).reduce((acc, current) => {
      if (_.get(this._attributes, [current, 'type'])) {
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

  update: async function (params) {
    return this.update({
      [this.primaryKey]: params[this.primaryKey] || params.id
    }, params, {
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

  countByRoles: async function () {
    return this.aggregate([
      {
        $group: {
          _id: "$role",
          total: {$sum: 1}
        }
      }
    ]);
  }
};
