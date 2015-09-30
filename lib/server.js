'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

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
strapiFactory.isLocalStrapiValid = _.bind(singleton.isLocalStrapiValid, singleton);
strapiFactory.isStrapiAppSync = _.bind(singleton.isStrapiAppSync, singleton);
