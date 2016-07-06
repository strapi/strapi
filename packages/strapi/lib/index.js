'use strict';

/**
 * Module dependencies
 */

// Local dependencies.
const Server = require('./server');

/**
 * Instantiate and expose a Strapi singleton
 * (maintains legacy support).
 */

module.exports = new Server(); // Strapi instance instanciated

/**
 * Expose constructor for convenience/tests
 */

module.exports.Strapi = Server; // Strapi instance not instanciated

// To access the Strapi application constructor, do:
//   var strapi = require('strapi').constructor;
//   var newApp = new strapi();
//
// Or to get a factory method which generates new instances:
//   var strapi = require('strapi/lib/server');
//   var newApp = strapi();
