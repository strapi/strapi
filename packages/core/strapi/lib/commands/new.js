'use strict';

const { generateNewApp } = require('@strapi/generate-new');

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = function (...args) {
  return generateNewApp(...args);
};
