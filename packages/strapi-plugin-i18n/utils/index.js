'use strict';

const { prop } = require('lodash/fp');

// retrieve a local service
const getService = name => {
  return prop(`i18n.services.${name}`, strapi.plugins);
};

module.exports = {
  getService,
};
