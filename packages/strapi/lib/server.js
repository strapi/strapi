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

module.exports = strapiFactory;

function strapiFactory() {
  return new Strapi();
}

// Backwards compatibility for Strapi singleton usage.
const singleton = strapiFactory();
strapiFactory.isLocalStrapiValid = singleton.isLocalStrapiValid.bind(singleton);
strapiFactory.isStrapiAppSync = singleton.isStrapiAppSync.bind(singleton);
