#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const winston = require('winston');

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
 * `$ strapi logout`
 *
 * Logout your account from the Strapi Studio.
 */

module.exports = function () {
  const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

  // Try to access the `.strapirc` at $HOME.
  fs.access(path.resolve(HOME, '.strapirc'), fs.F_OK | fs.R_OK | fs.W_OK, function (err) {
    if (err) {
      logger.error('You are not logged in.');
    } else {
      const config = JSON.parse(fs.readFileSync(path.resolve(HOME, '.strapirc'), 'utf8'));

      delete config.email;
      delete config.token;

      fs.writeFileSync(path.resolve(HOME, '.strapirc'), JSON.stringify(config), 'utf8');
      logger.info('Your machine is not linked to the Strapi Studio anymore.');
      process.exit(0);
    }
  });
};
