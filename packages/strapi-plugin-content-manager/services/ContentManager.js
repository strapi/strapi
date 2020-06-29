'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetchAll(params, query) {
    const { query: request, populate, ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    return strapi.entityService.find({ params: queryFilter, populate }, { model: params.model });
  },

  fetch(params, populate) {
    const { id, model } = params;

    return strapi.entityService.findOne(
      {
        params: {
          id,
        },
        populate,
      },
      { model }
    );
  },

  count(params, query) {
    const { model } = params;
    const { ...filters } = query;

    return strapi.entityService.count({ params: filters }, { model });
  },

  create({ data, files }, { model } = {}) {
    return strapi.entityService.create({ data, files }, { model });
  },

  edit(params, { data, files }, { model } = {}) {
    return strapi.entityService.update({ params, data, files }, { model });
  },

  delete(params) {
    const { id, model } = params;
    return strapi.entityService.delete({ params: { id } }, { model });
  },

  deleteMany(params, query) {
    const { model } = params;

    const { primaryKey } = strapi.query(model);
    const filter = { [`${primaryKey}_in`]: Object.values(query), _limit: 100 };

    return strapi.entityService.delete({ params: filter }, { model });
  },

  search(params, query) {
    const { model } = params;

    return strapi.entityService.search({ params: query }, { model });
  },

  countSearch(params, query) {
    const { model } = params;
    const { _q } = query;

    return strapi.entityService.countSearch({ params: { _q } }, { model });
  },
};
