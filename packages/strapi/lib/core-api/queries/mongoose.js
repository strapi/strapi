const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model, modelKey, strapi }) => {
  const assocs = model.associations.map(ast => ast.alias);

  const defaultPopulate = model.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias);

  return {
    find(params, populate) {
      const populateOpt = populate || defaultPopulate;

      const filters = convertRestQueryParams(params);

      return buildQuery({
        model,
        filters,
        populate: populateOpt,
      });
    },

    findOne(params, populate) {
      const populateOpt = populate || defaultPopulate;

      return model
        .findOne({
          [model.primaryKey]: params[model.primaryKey] || params.id,
        })
        .populate(populateOpt);
    },

    count(params) {
      const filters = convertRestQueryParams(params);

      return buildQuery({
        model,
        filters: { where: filters.where },
      }).count();
    },

    async create(values) {
      // Extract values related to relational data.
      const relations = _.pick(values, assocs);
      const data = _.omit(values, assocs);

      // Create entry with no-relational data.
      const entry = await model.create(data);

      // Create relational data and return the entry.
      return model.updateRelations({ _id: entry.id, values: relations });
    },

    async update(params, values) {
      // Extract values related to relational data.
      const relations = _.pick(values, assocs);
      const data = _.omit(values, assocs);

      // Update entry with no-relational data.
      await model.updateOne(params, data, { multi: true });

      // Update relational data and return the entry.
      return model.updateRelations(
        Object.assign(params, { values: relations })
      );
    },

    async delete(params) {
      const data = await model
        .findOneAndRemove(params, {})
        .populate(defaultPopulate);

      if (!data) {
        return data;
      }

      await Promise.all(
        model.associations.map(async association => {
          if (!association.via || !data._id || association.dominant) {
            return true;
          }

          const search =
            _.endsWith(association.nature, 'One') ||
            association.nature === 'oneToMany'
              ? { [association.via]: data._id }
              : { [association.via]: { $in: [data._id] } };
          const update =
            _.endsWith(association.nature, 'One') ||
            association.nature === 'oneToMany'
              ? { [association.via]: null }
              : { $pull: { [association.via]: data._id } };

          // Retrieve model.
          const model = association.plugin
            ? strapi.plugins[association.plugin].models[
                association.model || association.collection
              ]
            : strapi.models[association.model || association.collection];

          return model.update(search, update, { multi: true });
        })
      );

      return data;
    },

    search(params, populate) {
      // Convert `params` object to filters compatible with Mongo.
      const filters = strapi.utils.models.convertParams(modelKey, params);

      const $or = buildSearchOr(model, params._q);

      return model
        .find({ $or })
        .sort(filters.sort)
        .skip(filters.start)
        .limit(filters.limit)
        .populate(populate || defaultPopulate);
    },

    countSearch(params) {
      const $or = buildSearchOr(model, params._q);
      return model.find({ $or }).countDocuments();
    },
  };
};

const buildSearchOr = (model, query) => {
  return Object.keys(model.attributes).reduce((acc, curr) => {
    switch (model.attributes[curr].type) {
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(query))) {
          return acc.concat({ [curr]: query });
        }

        return acc;
      case 'string':
      case 'text':
      case 'password':
        return acc.concat({ [curr]: { $regex: query, $options: 'i' } });
      case 'boolean':
        if (query === 'true' || query === 'false') {
          return acc.concat({ [curr]: query === 'true' });
        }

        return acc;
      default:
        return acc;
    }
  }, []);
};
