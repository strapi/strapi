'use strict';

/**
 * default mongoose service
 *
 */

const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ modelId }) => ({
  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */

  fetchAll: (params, populate) => {
    const model = strapi.models[modelId];

    const filters = convertRestQueryParams(params);
    const populateOpt =
      populate ||
      model.associations
        .filter(ast => ast.autoPopulate !== false)
        .map(ast => ast.alias);

    return buildQuery({
      model,
      filters,
      populate: populateOpt,
    });
  },

  /**
   * Promise to fetch a record.
   *
   * @return {Promise}
   */

  fetch: params => {
    const model = strapi.models[modelId];

    // Select field to populate.
    const populate = model.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return model
      .findOne(_.pick(params, _.keys(model.schema.paths)))
      .populate(populate);
  },

  /**
   * Promise to count <%= humanizeIdPluralized %>.
   *
   * @return {Promise}
   */

  count: params => {
    const model = strapi.models[modelId];

    const filters = convertRestQueryParams(params);

    return buildQuery({
      model: model,
      filters: { where: filters.where },
    }).count();
  },

  /**
   * Promise to add a record.
   *
   * @return {Promise}
   */

  add: async values => {
    const model = strapi.models[modelId];

    // Extract values related to relational data.
    const relations = _.pick(values, model.associations.map(ast => ast.alias));
    const data = _.omit(values, model.associations.map(ast => ast.alias));

    // Create entry with no-relational data.
    const entry = await model.create(data);

    // Create relational data and return the entry.
    return model.updateRelations({ _id: entry.id, values: relations });
  },

  /**
   * Promise to edit a record.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    const model = strapi.models[modelId];

    // Extract values related to relational data.
    const relations = _.pick(values, model.associations.map(a => a.alias));
    const data = _.omit(values, model.associations.map(a => a.alias));

    // Update entry with no-relational data.
    await model.updateOne(params, data, { multi: true });

    // Update relational data and return the entry.
    return model.updateRelations(Object.assign(params, { values: relations }));
  },

  /**
   * Promise to remove a record.
   *
   * @return {Promise}
   */

  remove: async params => {
    const model = strapi.models[modelId];

    // Select field to populate.
    const populate = model.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await model.findOneAndRemove(params, {}).populate(populate);

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

  /**
   * Promise to search a record.
   *
   * @return {Promise}
   */

  search: async params => {
    const model = strapi.models[modelId];

    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams(model.globalId, params);
    // Select field to populate.
    const populate = model.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    const $or = Object.keys(model.attributes).reduce((acc, curr) => {
      switch (model.attributes[curr].type) {
        case 'integer':
        case 'float':
        case 'decimal':
          if (!_.isNaN(_.toNumber(params._q))) {
            return acc.concat({ [curr]: params._q });
          }

          return acc;
        case 'string':
        case 'text':
        case 'password':
          return acc.concat({ [curr]: { $regex: params._q, $options: 'i' } });
        case 'boolean':
          if (params._q === 'true' || params._q === 'false') {
            return acc.concat({ [curr]: params._q === 'true' });
          }

          return acc;
        default:
          return acc;
      }
    }, []);

    return model
      .find({ $or })
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },
});
