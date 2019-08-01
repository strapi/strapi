'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetch(params, source, populate) {
    return strapi
      .query(params.model, source)
      .findOne({ id: params.id }, populate);
  },

  fetchAll(params, query) {
    const { query: request, source, populate = [], ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    // Find entries using `queries` system
    return strapi.query(params.model, source).find(queryFilter, populate);
  },

  count(params, query) {
    const { source, ...filters } = query;
    return strapi.query(params.model, source).count(filters);
  },

  async add(params, values, source) {
    return await strapi.query(params.model, source).create(values);
  },

  async edit(params, values, source) {
    return strapi.query(params.model, source).update({ id: params.id }, values);
  },

  delete(params, { source }) {
    return strapi.query(params.model, source).delete({ id: params.id });
  },

  deleteMany(params, query) {
    const { source } = query;
    const { model } = params;

    const toRemove = Object.values(_.omit(query, 'source'));
    const { primaryKey } = strapi.query(model, source);
    const filter = { [`${primaryKey}_in`]: toRemove, _limit: 100 };

    return strapi.query(model, source).delete(filter);
  },

  search(params, query) {
    const { model } = params;
    const { source } = query;

    return strapi.query(model, source).search(query);
  },

  countSearch(params, query) {
    const { model } = params;
    const { source, _q } = query;
    return strapi.query(model, source).countSearch({ _q });
  },
};
