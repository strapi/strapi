'use strict';

const { prop } = require('lodash/fp');

module.exports = {
  // retrieve a local service from the contet manager plugin to make the code more readable
  getService(name) {
    return prop(`content-manager.services.${name}`, strapi.plugins);
  },
};
