'use strict';

// Start date
global.startedAt = Date.now();

/**
 * Module dependencies
 */

// Local dependencies.
const strapi = require('./Strapi');

/**
 * Expose `Strapi` factory
 * (maintains backwards compatibility with constructor usage).
 */

module.exports = strapiFactory;

function strapiFactory() {
  return new strapi();
}

// Backwards compatibility for Strapi singleton usage.
const singleton = strapiFactory();
strapiFactory.isLocalStrapiValid = singleton.isLocalStrapiValid.bind(singleton);
strapiFactory.isStrapiAppSync = singleton.isStrapiAppSync.bind(singleton);
