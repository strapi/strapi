'use strict';

const { prop } = require('lodash/fp');

module.exports = {
  // retrieve a local service
  getService(name) {
    return prop(`content-manager.services.${name}`, strapi.plugins);
  },
};
