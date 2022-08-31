'use strict';

const instanciatePermissionsUtilities = require('./permissions');

/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (strapi) => {
  return {
    permissions: instanciatePermissionsUtilities(strapi),
  };
};

module.exports = createContentAPI;
