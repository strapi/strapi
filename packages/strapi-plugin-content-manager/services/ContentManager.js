'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetchAll(model, query) {
    const { query: request, populate, ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    return strapi.entityService.find(
      {
        params: queryFilter,
        populate,
      },
      { model }
    );
  },

  fetch(model, id, config = {}) {
    const { query = {}, populate } = config;

    return strapi.entityService.findOne(
      {
        params: { ...query, id },
        populate,
      },
      { model }
    );
  },

  count(model, query) {
    return strapi.entityService.count({ params: query }, { model });
  },

  create({ data, files }, { model } = {}) {
    return strapi.entityService.create({ data, files }, { model });
  },

  edit(params, { data, files }, { model } = {}) {
    return strapi.entityService.update({ params, data, files }, { model });
  },

  delete(model, id, query) {
    return strapi.entityService.delete(
      { params: { ...query, _where: _.concat({ id }, query._where) } },
      { model }
    );
  },

  deleteMany(model, ids, query) {
    const { primaryKey } = strapi.query(model);

    return strapi.entityService.delete(
      {
        params: {
          _limit: 100,
          ...query,
          _where: _.concat({ [`${primaryKey}_in`]: ids }, query._where),
        },
      },
      { model }
    );
  },

  search(model, query, params) {
    return strapi.entityService.search({ params: { ...query, ...params } }, { model });
  },

  countSearch(model, query) {
    return strapi.entityService.countSearch({ params: query }, { model });
  },
};
