'use strict';

const _ = require('lodash');
const uploadFiles = require('../utils/upload-files');
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
    const { query: request, source, populate, ...filters } = query;

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

  async createMultipart(data, { files = {}, model, source } = {}) {
    const entry = await strapi.query(model, source).create(data);

    await uploadFiles(entry, files, { model, source });

    return strapi.query(model, source).findOne({ id: entry.id });
  },

  async create(data, { files, model, source } = {}) {
    const entry = await strapi.query(model, source).create(data);

    if (files) {
      await uploadFiles(entry, files, { model, source });
      return strapi.query(model, source).findOne({ id: entry.id });
    }

    return entry;
  },

  async edit(params, data, { model, source, files } = {}) {
    const entry = await strapi
      .query(model, source)
      .update({ id: params.id }, data);

    if (files) {
      await uploadFiles(entry, files, { model, source });
      return strapi.query(model, source).findOne({ id: entry.id });
    }

    return entry;
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
