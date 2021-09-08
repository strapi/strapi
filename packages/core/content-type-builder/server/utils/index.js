'use strict';

// retrieve a local service
const getService = name => {
  return strapi.plugin('content-type-builder').service(name);
};

module.exports = {
  getService,
};
