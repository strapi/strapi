'use strict';

const instantiatePermissionsUtilities = require('./permissions');

/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (strapi) => {
  return {
    permissions: instantiatePermissionsUtilities(strapi),
  };
};

module.exports = createContentAPI;
