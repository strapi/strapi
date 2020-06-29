'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetchAll(model, query, params = {}) {
    const { query: request, populate, ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    return strapi.entityService.find(
      {
        params: { ...queryFilter, ...params },
        populate,
      },
      { model }
    );
  },

  fetch(model, id, config = {}) {
    const { params = {}, populate } = config;

    return strapi.entityService.findOne(
      {
        params: { ...params, id },
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

  delete(model, id, params) {
    return strapi.entityService.delete({ params: { _where: [{ id }, params] } }, { model });
  },

  deleteMany(model, query, params) {
    const { primaryKey } = strapi.query(model);

    return strapi.entityService.delete(
      {
        params: {
          _limit: 100,
          _where: [{ [`${primaryKey}_in`]: Object.values(query) }, params],
        },
      },
      { model }
    );
  },

  search(model, query, params) {
    return strapi.entityService.search({ params: { ...query, ...params } }, { model });
  },

  countSearch(params, query) {
    const { model } = params;
    const { _q } = query;

    return strapi.entityService.countSearch({ params: { _q } }, { model });
  },
};
