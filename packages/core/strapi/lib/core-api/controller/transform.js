'use strict';

const { isNil, isPlainObject } = require('lodash/fp');

const transformResponse = (resource, meta = {}) => {
  if (isNil(resource)) {
    return resource;
  }

  return {
    data: transformEntry(resource),
    meta,
  };
};

const transformEntry = entry => {
  if (isNil(entry)) {
    return entry;
  }

  if (Array.isArray(entry)) {
    return entry.map(singleEntry => transformEntry(singleEntry));
  }

  if (!isPlainObject(entry)) {
    throw new Error('Entry must be an object');
  }

  const { id, ...attributes } = entry;

  return {
    id,
    attributes,
    // NOTE: not necessary for now
    // meta: {},
  };
};

module.exports = {
  transformResponse,
};
