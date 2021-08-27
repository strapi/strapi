'use strict';

const crypto = require('crypto');

/**
 * @typedef ApiToken
 *
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} accessKey
 * @property {'read-only'|'full-access'} type
 */

/**
 * @param {Object} attributes
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns {Promise<boolean>}
 */
const exists = async (attributes = {}) => {
  return (await strapi.query('admin::api-token').count({ where: attributes })) > 0;
};

/**
 * @param {Object} attributes
 * @param {'read-only'|'full-access'} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 *
 * @returns {Promise<ApiToken>}
 */
const create = async attributes => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  return strapi.query('admin::api-token').create({
    select: ['id', 'name', 'description', 'type', 'accessKey'],
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
