'use strict';

const { isNil, isPlainObject } = require('lodash/fp');
const { parseMultipartData } = require('@strapi/utils');

const parseBody = (ctx) => {
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

const transformComponent = (data, component) => {
  if (Array.isArray(data)) {
    return data.map((datum) => transformComponent(datum, component));
  }

  const res = transformEntry(data, component);

  if (isNil(res)) {
    return res;
  }

  const { id, attributes } = res;
  return { id, ...attributes };
};

const transformEntry = (entry, type) => {
  if (isNil(entry)) {
    return entry;
  }

  if (Array.isArray(entry)) {
    return entry.map((singleEntry) => transformEntry(singleEntry, type));
  }

  if (!isPlainObject(entry)) {
    throw new Error('Entry must be an object');
  }

  const { id, ...properties } = entry;

  const attributeValues = {};

  for (const key of Object.keys(properties)) {
    const property = properties[key];
    const attribute = type && type.attributes[key];

    if (attribute && attribute.type === 'relation') {
      const data = transformEntry(property, strapi.contentType(attribute.target));

      attributeValues[key] = { data };
    } else if (attribute && attribute.type === 'component') {
      attributeValues[key] = transformComponent(property, strapi.components[attribute.component]);
    } else if (attribute && attribute.type === 'dynamiczone') {
      if (isNil(property)) {
        attributeValues[key] = property;
      }

      attributeValues[key] = property.map((subProperty) => {
        return transformComponent(subProperty, strapi.components[subProperty.__component]);
      });
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
