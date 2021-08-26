'use strict';

const crypto = require('crypto');

/**
 * @param {Object} attributes
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns boolean
 */
const exists = (attributes = {}) => {
  return strapi.query('strapi::api-token').count({ where: attributes }) > 0;
};

/**
 * @param {Object} attributes
 * @param {'read-only'|'full-access'} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns {Promise<Record<'id'|'name'|'description'|'type'|'accessKey', string>>}
 */
const create = async attributes => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  return strapi.query('strapi::api-token').create({
    data: {
      ...attributes,
      accessKey,
    },
  });
};

module.exports = {
  create,
  exists,
};
