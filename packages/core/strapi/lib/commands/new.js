'use strict';

/**
 * Generate a new Strapi application.
 *
 * `$ strapi new`
 *
 * @param {any} args
 */
module.exports = function(...args) {
  return require('@strapi/generate-new')(...args);
};
