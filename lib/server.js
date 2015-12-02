'use strict';

/**
 * Module dependencies
 */

// Local dependencies.
const Strapi = require('./Strapi');

/**
 * Expose `Strapi` factory
 * (maintains backwards compatibility with constructor usage).
 */

module.exports = function () {
  return new Strapi();
};
