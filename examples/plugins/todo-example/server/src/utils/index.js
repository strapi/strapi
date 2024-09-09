'use strict';

// Retrieve a local service
function getService(name) {
  return strapi.plugin('todo').service(name);
}

module.exports = {
  getService,
};
