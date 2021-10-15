'use strict';

/**
 * @param {string} name
 */
const getService = name => {
  return strapi.service(`admin::${name}`);
};

module.exports = {
  getService,
};
