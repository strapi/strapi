'use strict';

const _ = require('lodash');
const uploadFiles = require('../utils/upload-files');
/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetch(params, populate) {
    return strapi.query(params.model).findOne({ id: params.id }, populate);
  },

  fetchAll(params, query) {
    const { query: request, populate, ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    // Find entries using `queries` system
    return strapi.query(params.model).find(queryFilter, populate);
  },

  count(params, query) {
    const { ...filters } = query;
    return strapi.query(params.model).count(filters);
  },

  async create(data, { files, model } = {}) {
    const entry = await strapi.query(model).create(data);

    if (files) {
      await uploadFiles(entry, files, { model });
      return strapi.query(model).findOne({ id: entry.id });
    }

    return entry;
  },

  async edit(params, data, { model, files } = {}) {
    const entry = await strapi.query(model).update({ id: params.id }, data);

    if (files) {
      await uploadFiles(entry, files, { model });
      return strapi.query(model).findOne({ id: entry.id });
    }

    return entry;
  },

  delete(params) {
    return strapi.query(params.model).delete({ id: params.id });
  },

  deleteMany(params, query) {
    const { model } = params;

    const toRemove = Object.values(_.omit(query, 'source'));
    const { primaryKey } = strapi.query(model);
    const filter = { [`${primaryKey}_in`]: toRemove, _limit: 100 };

    return strapi.query(model).delete(filter);
  },

  search(params, query) {
    const { model } = params;

    return strapi.query(model).search(query);
  },

  countSearch(params, query) {
    const { model } = params;
    const { _q } = query;
    return strapi.query(model).countSearch({ _q });
  },
};
