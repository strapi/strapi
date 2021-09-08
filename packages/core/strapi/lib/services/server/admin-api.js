'use strict';

const { createAPI } = require('./api');

const createAdminAPI = strapi => {
  const opts = {
    prefix: '', // '/admin';
    type: 'admin',
  };

  return createAPI(strapi, opts);
};

module.exports = { createAdminAPI };
