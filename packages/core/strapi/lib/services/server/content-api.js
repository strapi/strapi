'use strict';

const { createAPI } = require('./api');

const createContentAPI = (strapi) => {
  const prefix = strapi.config.server.url || '';
  const opts = {
    prefix: `${prefix}${strapi.config.get('api.rest.prefix', '/api')}`,
    type: 'content-api',
  };

  return createAPI(strapi, opts);
};

module.exports = {
  createContentAPI,
};
