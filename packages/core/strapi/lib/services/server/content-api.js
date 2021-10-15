'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const { createAPI } = require('./api');

/**
 * @param {Strapi} strapi
 */
const createContentAPI = strapi => {
  const opts = {
    prefix: strapi.config.get('api.prefix', '/api'),
    type: 'content-api',
  };

  return createAPI(strapi, opts);
};

module.exports = {
  createContentAPI,
};
