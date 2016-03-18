'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const winston = require('winston');

/**
 * Common logger
 */

module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: 'level'
    })
  ]
});
