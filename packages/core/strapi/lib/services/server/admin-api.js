'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const { createAPI } = require('./api');

/**
 * @param {Strapi} strapi
 */
const createAdminAPI = strapi => {
  const opts = {
    prefix: '', // '/admin';
    type: 'admin',
  };

  return createAPI(strapi, opts);
};

module.exports = { createAdminAPI };
