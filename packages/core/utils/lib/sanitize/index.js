'use strict';

const { isArray, cloneDeep } = require('lodash/fp');

const { getNonWritableAttributes } = require('../content-types');
const { pipeAsync } = require('../async');

const visitors = require('./visitors');
const sanitizers = require('./sanitizers');
const traverseEntity = require('../traverse-entity');

const { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } = require('../traverse');

const createContentAPISanitizers = () => {
  const sanitizeInput = (data, schema, { auth } = {}) => {
    if (isArray(data)) {
      return Promise.all(data.map((entry) => sanitizeInput(entry, schema, { auth })));
    }

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      // Remove non writable attributes
      traverseEntity(visitors.restrictedFields(nonWritableAttributes), { schema }),
    ];

    if (auth) {
      // Remove restricted relations
      transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
    }

    // Apply sanitizers from registry if exists
    strapi.sanitizers
      .get('content-api.input')
      .forEach((sanitizer) => transforms.push(sanitizer(schema)));

    return pipeAsync(...transforms)(data);
  };

  const sanitizeOutput = async (data, schema, { auth } = {}) => {
    if (isArray(data)) {
      const res = new Array(data.length);
      for (let i = 0; i < data.length; i += 1) {
        res[i] = await sanitizeOutput(data[i], schema, { auth });
      }
      return res;
    }

    const transforms = [(data) => sanitizers.defaultSanitizeOutput(schema, data)];

    if (auth) {
      transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
    }

    // Apply sanitizers from registry if exists
    strapi.sanitizers
      .get('content-api.output')
      .forEach((sanitizer) => transforms.push(sanitizer(schema)));

    return pipeAsync(...transforms)(data);
  };

  const sanitizeQuery = async (query, schema, { auth } = {}) => {
    const { filters, sort, fields, populate } = query;

    const sanitizedQuery = cloneDeep(query);

    if (filters) {
      Object.assign(sanitizedQuery, { filters: await sanitizeFilters(filters, schema, { auth }) });
    }

    if (sort) {
      Object.assign(sanitizedQuery, { sort: await sanitizeSort(sort, schema, { auth }) });
    }

    if (fields) {
      Object.assign(sanitizedQuery, { fields: await sanitizeFields(fields, schema) });
    }

    if (populate) {
      Object.assign(sanitizedQuery, { populate: await sanitizePopulate(populate, schema) });
    }

    return sanitizedQuery;
  };

  const sanitizeFilters = (filters, schema, { auth } = {}) => {
    if (isArray(filters)) {
      return Promise.all(filters.map((filter) => sanitizeFilters(filter, schema, { auth })));
    }

    const transforms = [sanitizers.defaultSanitizeFilters(schema)];

    if (auth) {
      transforms.push(traverseQueryFilters(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(filters);
  };

  const sanitizeSort = (sort, schema, { auth } = {}) => {
    const transforms = [sanitizers.defaultSanitizeSort(schema)];

    if (auth) {
      transforms.push(traverseQuerySort(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(sort);
  };

  const sanitizeFields = (fields, schema) => {
    const transforms = [sanitizers.defaultSanitizeFields(schema)];

    return pipeAsync(...transforms)(fields);
  };

  const sanitizePopulate = (populate, schema, { auth } = {}) => {
    const transforms = [sanitizers.defaultSanitizePopulate(schema)];

    if (auth) {
      transforms.push(traverseQueryPopulate(visitors.removeRestrictedRelations(auth), { schema }));
    }

    return pipeAsync(...transforms)(populate);
  };

  return {
    input: sanitizeInput,
    output: sanitizeOutput,
    query: sanitizeQuery,
    filters: sanitizeFilters,
    sort: sanitizeSort,
    fields: sanitizeFields,
    populate: sanitizePopulate,
  };
};

module.exports = {
  contentAPI: createContentAPISanitizers(),

  sanitizers,
  visitors,
};
