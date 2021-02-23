'use strict';

const { prop, map } = require('lodash/fp');

const getService = name => {
  return prop(`admin.services.${name}`, strapi);
};

const getServices = (...names) => map(getService, names);

module.exports = {
  getService,
  getServices,
};
