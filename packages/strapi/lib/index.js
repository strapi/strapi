'use strict';

// Starting date
global.startedAt = Date.now();

/**
 * Instantiate and expose a Strapi singleton
 * (maintains legacy support).
 */

module.exports = function(global) {
  try {
    return global.strapi = require('./Strapi'); // Strapi instance instanciated
  } catch (error) {
    console.log(error); // eslint-disable-line no-console
  }
}.call(this, global);
