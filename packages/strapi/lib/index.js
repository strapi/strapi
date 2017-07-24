'use strict';

// Starting date
global.startedAt = Date.now();

/**
 * Instantiate and expose a Strapi singleton
 * (maintains legacy support).
 */

module.exports = function(global) {
  return global.strapi = require('./Strapi'); // Strapi instance instanciated
}.call(this, global);
