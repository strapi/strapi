'use strict';

const { prop } = require('lodash/fp');

const getService = name => {
  return prop(`admin.services.${name}`, strapi);
};

module.exports = {
  getService,
};
