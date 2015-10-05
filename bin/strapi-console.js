#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const REPL = require('repl');

// Public node modules.
const winston = require('winston');

// Local Strapi dependencies.
const server = require('../lib/server');

// Logger.
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: 'level'
    })
  ]
});

/**
 * `$ strapi console`
 *
 * Enter the interactive console (aka REPL) for the application
 * in our working directory.
 */

module.exports = function () {

  // Now load up the Strapi framework for real.
  const strapi = server();
  strapi.log.info('Starting the application in interactive mode...');
  strapi.start({}, function (err) {

    // Log and exit the REPL in case there is an error
    // while we were trying to start the server.
    if (err) {
      logger.error('Could not load the Strapi framework.');
      logger.error('Are you using the latest stable version?');
      process.exit(1);
    }

    // Open the Node.js REPL.
    const repl = REPL.start('strapi > ');
    repl.on('exit', function (err) {

      // Log and exit the REPL in case there is an error
      // while we were trying to open the REPL.
      if (err) {
        logger.error(err);
        process.exit(1);
      }

      process.exit(0);
    });
  });
};
