'use strict';

const { generateNewApp } = require('@strapi/generate-new');

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = (...args) => {
  return generateNewApp(...args);
};
