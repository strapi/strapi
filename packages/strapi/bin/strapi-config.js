#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi config`
 *
 * Read or create the RC file a $HOME to
 * use custom generators.
 */

module.exports = function () {
  const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

  fs.access(path.resolve(HOME, '.strapirc'), fs.F_OK | fs.R_OK | fs.W_OK, err => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.writeFile(path.resolve(HOME, '.strapirc'), JSON.stringify({
          generators: {}
        }, null, '\t'), err => {
          if (err) {
            logger.error('Impossible to write the `.strapirc` file at `' + HOME + '`');
            logger.error('Please check read/write permissions before execute `$ strapi config`');
            logger.error('You can manually create the file at `' + HOME + '`');
          } else {
            logger.info('Global configuration file successfully created at `' + HOME + '`');
            logger.info('Please read http://strapi.io/documentation/customization to learn more');
          }
          process.exit(1);
        });
      } else if (err.code === 'EACCES') {
        logger.error('Impossible to access the `.strapirc` file at `' + HOME + '`');
        logger.error('Please check read/write permissions before execute `$ strapi config`');
        logger.error('You can manually create the file at `' + HOME + '`');
        process.exit(1);
      }
    } else {
      logger.warn('Looks like the configuration file already exists at `' + HOME + '`');
      process.exit(0);
    }
  });
};
