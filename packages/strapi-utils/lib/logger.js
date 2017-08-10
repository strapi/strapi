'use strict';

/**
 * Logger.
 */

const pino = require('pino');

module.exports = pino({
  level: 'debug',
  timestamp: false,
  prettyPrint: true,
  forceColor: true
});
