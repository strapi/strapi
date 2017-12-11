'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */

module.exports = {
  fetchAll: async (params, query) => {
    const { limit, skip = 0, sort, query : request, queryAttribute, source, page } = query;

    // Find entries using `queries` system
    return await strapi.query(params.model, source).find({
      limit,
      skip,
      sort,
      query: request,
      queryAttribute
    });
  },

  count: async (params, source) => {
    return await strapi.query(params.model, source).count();
  },

  fetch: async (params, source) => {
    return await strapi.query(params.model, source).findOne({
      id: params.id
    });
  },

  add: async (params, values, source) => {
    // Create an entry using `queries` system
    return await strapi.query(params.model, source).create({
      values
    });
  },

  edit: async (params, values, source) => {
    return strapi.query(params.model, source).update({
      id: params.id,
      values
    });
  },

  delete: async (params, { source }) => {
    const response = await strapi.query(params.model, source).findOne({
      id: params.id
    });

    params.values = Object.keys(JSON.parse(JSON.stringify(response))).reduce((acc, current) => {
      const association = (strapi.models[params.model] || strapi.plugins[source].models[params.model]).associations.filter(x => x.alias === current)[0];

      // Remove relationships.
      if (association) {
        acc[current] = _.isArray(response[current]) ? [] : null;
      }

      return acc;
    }, {});

    if (!_.isEmpty(params.values)) {
      // Run update to remove all relationships.
      await strapi.query(params.model, source).update(params);
    }

    // Delete an entry using `queries` system
    return await strapi.query(params.model, source).delete({
      id: params.id
    });
  },
};
