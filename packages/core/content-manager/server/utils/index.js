'use strict';

// retrieve a local service
const getService = (name) => {
  return strapi.plugin('content-manager').service(name);
};

module.exports = {
  getService,
};
