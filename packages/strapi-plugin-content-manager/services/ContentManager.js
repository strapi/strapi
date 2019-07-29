'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */

const parseFormInput = value => {
  try {
    const parsed = JSON.parse(value);
    // do not modify initial value if it is string except 'null'
    if (typeof parsed !== 'string') {
      value = parsed;
    }
  } catch (e) {
    // Silent.
  }

  return _.isArray(value) ? value.map(parseFormInput) : value;
};

const parseFormData = fields =>
  Object.keys(fields).reduce((acc, current) => {
    acc[current] = parseFormInput(fields[current]);
    return acc;
  }, {});

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
    // Multipart/form-data.
    if (values.hasOwnProperty('fields') && values.hasOwnProperty('files')) {
      const data = parseFormData(values.fields);
      const entry = await strapi.query(params.model, source).create(data);

      // Then, request plugin upload.
      if (strapi.plugins.upload && Object.keys(values.files).length > 0) {
        // Upload new files and attach them to this entity.
        await strapi.plugins.upload.services.upload.uploadToEntity(
          {
            id: entry.id || entry._id,
            model: params.model,
          },
          values.files,
          source
        );
      }

      return entry;
    }

    // Create an entry using `queries` system
    return await strapi.query(params.model, source).create(values);
  },

  async edit(params, values, source) {
    // Multipart/form-data.
    if (values.hasOwnProperty('fields') && values.hasOwnProperty('files')) {
      // set empty attributes if old values was cleared
      _.difference(
        Object.keys(values.files),
        Object.keys(values.fields)
      ).forEach(attr => {
        values.fields[attr] = [];
      });

      const data = parseFormData(values.fields);
      const updatedEntity = await strapi
        .query(params.model, source)
        .update({ id: params.id }, data);

      // Then, request plugin upload.
      if (strapi.plugins.upload) {
        // Upload new files and attach them to this entity.
        await strapi.plugins.upload.services.upload.uploadToEntity(
          params,
          values.files,
          source
        );
      }

      return updatedEntity;
    }

    // Raw JSON.
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
