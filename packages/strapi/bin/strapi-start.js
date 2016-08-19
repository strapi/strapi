#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public dependencies
const _ = require('lodash');
const forever = require('forever-monitor');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = function () {
  try {
    // Require server configurations
    const server = require(path.resolve(process.cwd(), 'config', 'environments', 'development', 'server.json'));
    const options = {};

    // Set NODE_ENV
    if (_.isEmpty(process.env.NODE_ENV)) {
      process.env.NODE_ENV = 'development';
    }

    if (server.reload === true && process.env.NODE_ENV === 'development') {
      _.assign(options, {
        silent: false,
        watch: true,
        watchDirectory: process.cwd(),
        killTree: true // Kills the entire child process tree on `exit`
      });
    } else {
      _.assign(options, {
        silent: process.env.NODE_ENV === 'production',
        watch: false
      });
    }

    const child = new (forever.Monitor)('server.js', options);

    // Run listeners
    child.on('restart', function() {
      logger.info('Restarting due to changes...');
      console.log();
    });

    // Start child process
    child.start();
  } catch (e) {
    console.error(e);
    process.exit(0);
  }
};
