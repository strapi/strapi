#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const REPL = require('repl');

// Local Strapi dependencies.
const strapi = require('../lib/');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi console`
 *
 * Enter the interactive console (aka REPL) for the application
 * in our working directory.
 */

module.exports = function () {

  // Only log if the process is a master.
  strapi.log.info('Starting the application in interactive mode...');

  strapi.start({}, err => {

    // Log and exit the REPL in case there is an error
    // while we were trying to start the server.
    if (err) {
      logger.error('Could not load the Strapi framework.');
      logger.error('Are you using the latest stable version?');
      process.exit(1);
    }

    // Open the Node.js REPL.
    const repl = REPL.start(strapi.config.name + ' > ' || 'strapi > ');
    repl.on('exit', err => {

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
