'use strict';

const { isNil, isPlainObject } = require('lodash/fp');
const { parseMultipartData } = require('@strapi/utils');

const parseBody = ctx => {
  if (ctx.is('multipart')) {
    return parseMultipartData(ctx);
  }

  const { data } = ctx.request.body || {};

  return { data };
};

const transformResponse = (resource, meta = {}, { contentType } = {}) => {
  if (isNil(resource)) {
    return resource;
  }

  return {
    data: transformEntry(resource, contentType),
    meta,
  };
};

const transformEntry = (entry, contentType) => {
  if (isNil(entry)) {
    return entry;
  }

  if (Array.isArray(entry)) {
    return entry.map(singleEntry => transformEntry(singleEntry, contentType));
  }

  if (!isPlainObject(entry)) {
    throw new Error('Entry must be an object');
  }

  const { id, ...properties } = entry;

  const attributeValues = {};

  for (const key in properties) {
    const property = properties[key];
    const attribute = contentType && contentType.attributes[key];

    if (attribute && attribute.type === 'relation') {
      const data = transformEntry(property, strapi.contentType(attribute.target));

      attributeValues[key] = { data };
    } else if (attribute && attribute.type === 'media') {
      const data = transformEntry(property, strapi.contentType('plugin::upload.file'));

      attributeValues[key] = { data };
    } else {
      attributeValues[key] = property;
    }
  }

  return {
    id,
    attributes: attributeValues,
    // NOTE: not necessary for now
    // meta: {},
  };
};

module.exports = {
  parseBody,
  transformResponse,
};
