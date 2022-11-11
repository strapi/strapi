'use strict';

const { createAPI } = require('./api');

const createAdminAPI = (strapi) => {
  const prefix = strapi.config.server.url || '';

  const opts = {
    prefix, // config server
    type: 'admin',
  };

  return createAPI(strapi, opts);
};

module.exports = { createAdminAPI };
