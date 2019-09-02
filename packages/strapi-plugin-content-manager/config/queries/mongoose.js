const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model }) => ({
  find(params, populate, raw = false) {
    const filters = convertRestQueryParams(params);

    const query = buildQuery({
      model,
      filters,
      populate: populate || model.associations.map(x => x.alias),
    });

    return raw ? query.lean() : query;
  },

  count(params) {
    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters: { where: filters.where },
    }).count();
  },

  search(params, populate) {
    // eslint-disable-line  no-unused-vars
    const $or = Object.keys(model.attributes).reduce((acc, curr) => {
      switch (model.attributes[curr].type) {
        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params.search))) {
            return acc.concat({ [curr]: params.search });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({
            [curr]: { $regex: params.search, $options: 'i' },
          });
        case 'boolean':
          if (params.search === 'true' || params.search === 'false') {
            return acc.concat({ [curr]: params.search === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    return model
      .find({ $or })
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip))
      .populate(populate || model.associations.map(x => x.alias).join(' '))
      .lean();
  },

  countSearch(params = {}) {
    // eslint-disable-line  no-unused-vars
    const $or = Object.keys(model.attributes).reduce((acc, curr) => {
      switch (model.attributes[curr].type) {
        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params.search))) {
            return acc.concat({ [curr]: params.search });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({
            [curr]: { $regex: params.search, $options: 'i' },
          });
        case 'boolean':
          if (params.search === 'true' || params.search === 'false') {
            return acc.concat({ [curr]: params.search === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    return model.find({ $or }).countDocuments();
  },

  findOne(params, populate, raw = true) {
    const query = model
      .findOne({
        [model.primaryKey]: params[model.primaryKey] || params.id,
      })
      .populate(populate || model.associations.map(x => x.alias).join(' '));

    return raw ? query.lean() : query;
  },

  async create(params) {
    // Exclude relationships.
    const values = Object.keys(params.values).reduce((acc, current) => {
      if (model._attributes[current] && model._attributes[current].type) {
        acc[current] = params.values[current];
      }

      return acc;
    }, {});

    const request = await model.create(values).catch(err => {
      if (err.message) {
        const message = err.message.split('index:');
        const field = _.words(_.last(message).split('_')[0]);
        err = { message: `This ${field} is already taken`, field };
      }
      throw err;
    });

    // Transform to JSON object.
    const entry = request.toJSON ? request.toJSON() : request;

    // Extract relations.
    const relations = model.associations.reduce((acc, association) => {
      if (params.values[association.alias]) {
        acc[association.alias] = params.values[association.alias];
      }

      return acc;
    }, {});

    return this.update({
      [model.primaryKey]: entry[model.primaryKey],
      values: _.assign(
        {
          id: entry[model.primaryKey],
        },
        relations
      ),
    });
  },

  update(params) {
    // Call the business logic located in the hook.
    // This function updates no-relational and relational data.
    return model.updateRelations(params);
  },

  delete(params) {
    // Delete entry.
    return model.findOneAndDelete({
      [model.primaryKey]: params.id,
    });
  },

  deleteMany(params) {
    return model.deleteMany({
      [model.primaryKey]: {
        $in: params[model.primaryKey] || params.id,
      },
    });
  },
});
