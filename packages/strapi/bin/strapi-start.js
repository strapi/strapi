#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cp = require('child_process');
const path = require('path');

// Public dependencies
const _ = require('lodash');
const forever = require('forever-monitor');
const semver = require('semver')

// Logger.
const { cli, logger } = require('strapi-utils');

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = function() {
  try {
    // Set NODE_ENV
    if (_.isEmpty(process.env.NODE_ENV)) {
      process.env.NODE_ENV = 'development';
    }

    // Require server configurations
    const server = require(path.resolve(
      process.cwd(),
      'config',
      'environments',
      'development',
      'server.json'
    ));

    if (process.env.NODE_ENV === 'development' && server.autoReload === true) {
      const options = _.assign(
        {},
        {
          silent: false,
          watch: true,
          watchDirectory: process.cwd(),
          watchIgnoreDotFiles: true, // Whether to ignore file starting with a '.'
          watchIgnorePatterns: [
            'node_modules/**/*',
            'public/**/*',
            '.git/**/*',
            '.idea'
          ], // Ignore patterns to use when watching files.
          killTree: true, // Kills the entire child process tree on `exit`,
          spinSleepTime: 0,
          command: 'node'
        }
      );

      const child = new forever.Monitor('server.js', options);

      // Run listeners
      child.on('watch:restart', info => {
        logger.info(
          'Restarting due to ' +
            info.file +
            '... (' +
            info.stat.replace(child.cwd, '.') +
            ')'
        );
        console.log();
      });

      child.on('exit:code', function(code) {
        if (code) {
          process.exit(code);
        }
      });

      // Start child process
      return child.start();
    }

    // Otherwise, if no workable local `strapi` module exists,
    // run the application using the currently running version
    // of `strapi`. This is probably always the global install.
    const strapi = function () {
      try {
        return require(path.resolve(process.cwd(), 'node_modules', 'strapi'));
      } catch (e) {
        return require('strapi');
      }
    }();

    strapi.start();

  } catch (e) {
    logger.error(e);
    process.exit(0);
  }
};

function afterwards(err, strapi) {
  if (err) {
    logger.error(err.stack ? err.stack : err);

    strapi ? strapi.stop() : process.exit(1);
  }
}
