#!/usr/bin/env node --harmony

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Public node modules.
const _ = require('lodash');
const prompt = require('prompt');
const request = require('request');
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
 * `$ strapi login`
 *
 * Connect your account to the Strapi dashboard.
 */

module.exports = function () {

  // First, check the internet connectivity.
  dns.resolve('google.com', function (err) {
    if (err) {
      logger.error('No internet access...');
      process.exit(1);
    }

    // Then, start the prompt with custom options.
    prompt.start();
    prompt.colors = false;
    prompt.message = 'your Strapi ';
    prompt.delimiter = '';

    // Get email address and password.
    prompt.get({
      properties: {
        email: {
          description: 'email address',
          pattern: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i,
          type: 'string',
          required: true
        },
        password: {
          description: 'password',
          type: 'string',
          hidden: true,
          required: true
        }
      }
    },

    // Callback.
    function (err, result) {

      // Just in case there is an error.
      if (err) {
        return err;
      }

      // Make the request to the dashboard with the email and password
      // from the prompt.
      request({
        method: 'POST',
        preambleCRLF: true,
        postambleCRLF: true,
        json: true,
        uri: 'http://dashboard.strapi.io/auth/local',
        body: {
          identifier: result.email,
          password: result.password
        }
      },

      // Callback.
      function (err, res, body) {
        const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

        // Stop if there is an error.
        if (err && err.code === 'ECONNREFUSED') {
          logger.error('Impossible to establish a connection with the Strapi dashboard.');
          logger.error('Please try again in a few minutes...');
          process.exit(1);
        } else if (res.statusCode === 400) {
          logger.error('Wrong credentials.');
          logger.error('You are not logged in.');
          process.exit(1);
        }

        // Try to access the `.strapirc` at $HOME.
        fs.access(path.resolve(HOME, '.strapirc'), fs.F_OK | fs.R_OK | fs.W_OK, function (err) {
          if (err && err.code === 'ENOENT') {
            fs.writeFileSync(path.resolve(HOME, '.strapirc'), JSON.stringify({
              email: body.user.email,
              token: body.token
            }), 'utf8');
            logger.info('You are successfully logged in as ' + body.user.email);
            process.exit(1);
          } else {
            const currentJSON = fs.readFileSync(path.resolve(HOME, '.strapirc'), 'utf8');
            const newJSON = _.merge(JSON.parse(currentJSON), {
              email: body.user.email,
              token: body.token
            });

            fs.writeFileSync(path.resolve(HOME, '.strapirc'), JSON.stringify(newJSON), 'utf8');
            logger.info('You are successfully logged in as ' + body.user.email);
            process.exit(0);
          }
        });
      });
    });
  });
};
