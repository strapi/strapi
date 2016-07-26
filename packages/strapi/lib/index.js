'use strict';

// Starting date
global.startedAt = Date.now();

/**
 * Instantiate and expose a Strapi singleton
 * (maintains legacy support).
 */

module.exports = require('./Strapi'); // Strapi instance instanciated
