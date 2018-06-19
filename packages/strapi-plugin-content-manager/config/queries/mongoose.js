const _ = require('lodash');

module.exports = {
  find: async function (params, populate, raw = false) {
    const query = this
      .find(params.where)
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip))
      .populate(populate || this.associations.map(x => x.alias).join(' '));

    return raw ? query.lean() : query;
  },

  count: async function (params) {
    return Number(await this
      .where(params.where)
      .count());
  },

  search: async function (params, populate) { // eslint-disable-line  no-unused-vars
    const $or = Object.keys(this.attributes).reduce((acc, curr) => {
      switch (this.attributes[curr].type) {
        case 'integer':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params.search))) {
            return acc.concat({ [curr]: params.search });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({ [curr]: { $regex: params.search, $options: 'i' } });
        case 'boolean':
          if (params.search === 'true' || params.search === 'false') {
            return acc.concat({ [curr]: params.search === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    return this
      .find({ $or })
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip))
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  countSearch: async function (params = {}) { // eslint-disable-line  no-unused-vars
    const $or = Object.keys(this.attributes).reduce((acc, curr) => {
      switch (this.attributes[curr].type) {
        case 'integer':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params.search))) {
            return acc.concat({ [curr]: params.search });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({ [curr]: { $regex: params.search, $options: 'i' } });
        case 'boolean':
          if (params.search === 'true' || params.search === 'false') {
            return acc.concat({ [curr]: params.search === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    return this
      .find({ $or })
      .count();
  },

  findOne: async function (params, populate, raw = true) {
    const query = this
      .findOne({
        [this.primaryKey]: params[this.primaryKey] || params.id
      })
      .populate(populate || this.associations.map(x => x.alias).join(' '));

    return raw ? query.lean() : query;
  },

  create: async function (params) {
    // Exclude relationships.
    const values = Object.keys(params.values).reduce((acc, current) => {
      if (this._attributes[current] && this._attributes[current].type) {
        acc[current] = params.values[current];
      }

      return acc;
    }, {});

    const request = await this.create(values)
      .catch((err) => {
        const message = err.message.split('index:');
        const field = _.words(_.last(message).split('_')[0]);
        const error = { message: `This ${field} is already taken`, field };

        throw error;
      });

    // Transform to JSON object.
    const entry = request.toJSON ? request.toJSON() : request;

    // Extract relations.
    const relations = this.associations.reduce((acc, association) => {
      if (params.values[association.alias]) {
        acc[association.alias] = params.values[association.alias];
      }

      return acc;
    }, {});

    return module.exports.update.call(this, {
      [this.primaryKey]: entry[this.primaryKey],
      values: _.assign({
        id: entry[this.primaryKey]
      }, relations)
    });
  },

  update: async function (params) {
    // Call the business logic located in the hook.
    // This function updates no-relational and relational data.
    return this.updateRelations(params);
  },

  delete: async function (params) {
    // Delete entry.
    return this
      .remove({
        [this.primaryKey]: params.id
      });
  },

  deleteMany: async function (params) {
    return this
      .remove({
        [this.primaryKey]: {
          $in: params[this.primaryKey] || params.id
        }
      });
  }
};
