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

  //TODO: implement multi delete => might just be a loop
  async deleteMany(params, query) {
    const { source } = query;
    const { model } = params;

    const primaryKey = strapi.plugins['content-manager'].queries(model, source)
      .primaryKey;
    const toRemove = Object.keys(query).reduce((acc, curr) => {
      if (curr !== 'source') {
        return acc.concat([query[curr]]);
      }

      return acc;
    }, []);

    const filter = { [`${primaryKey}_in`]: toRemove };
    const entries = await strapi.plugins['content-manager']
      .queries(model, source)
      .find(filter, null, true);
    const associations = strapi.plugins['content-manager'].queries(
      model,
      source
    ).associations;

    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];

      associations.forEach(association => {
        if (entry[association.alias]) {
          switch (association.nature) {
            case 'oneWay':
            case 'oneToOne':
            case 'manyToOne':
            case 'oneToManyMorph':
              entry[association.alias] = null;
              break;
            case 'oneToMany':
            case 'manyToMany':
            case 'manyToManyMorph':
              entry[association.alias] = [];
              break;
            default:
          }
        }
      });

      await strapi.plugins['content-manager'].queries(model, source).update({
        [primaryKey]: entry[primaryKey],
        values: _.pick(entry, associations.map(a => a.alias)),
      });
    }

    return strapi.plugins['content-manager'].queries(model, source).deleteMany({
      [primaryKey]: toRemove,
    });
  },
  search(params, query) {
    const { limit, skip, sort, source, _q, populate = [] } = query; // eslint-disable-line no-unused-vars
    const filters = strapi.utils.models.convertParams(params.model, query);

    // Find entries using `queries` system
    return strapi.query(params.model, source).search(
      {
        limit: limit || filters.limit,
        skip: skip || filters.start || 0,
        sort: sort || filters.sort,
        search: _q,
      },
      populate
    );
  },

  countSearch(params, query) {
    const { source, _q } = query;
    return strapi.query(params.model, source).countSearch({ search: _q });
  },
};
