'use strict';

// Start date
global.startedAt = Date.now();

/**
 * Module dependencies
 */

// Local dependencies.
const strapi = require('./Strapi');

/**
 * Instantiate and expose a Strapi singleton
 * (maintains legacy support).
 */

module.exports = new strapi(); // Strapi instance instanciated

/**
 * Expose constructor for convenience/tests
 */

module.exports.Strapi = strapi; // Strapi instance not instanciated

// To access the Strapi application constructor, do:
//   var strapi = require('strapi').constructor;
//   var newApp = new strapi();
//
// Or to get a factory method which generates new instances:
//   var strapi = require('strapi/lib/server');
//   var newApp = strapi();
