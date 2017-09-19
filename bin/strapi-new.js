#!/usr/bin/env node

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
const request = require('request');
const winston = require('winston');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

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
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = function () {

  // Pass the original CLI arguments down to the generator.
  const cliArguments = Array.prototype.slice.call(arguments);

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    generatorType: 'new',
    args: cliArguments,
    strapiPackageJSON: packageJSON
  };

  // Save the `dry` option inside the scope.
  if (scope.args[1] && scope.args[1].dry) {
    scope.dry = true;
  } else {
    scope.dry = false;
  }

  // Pass the original CLI arguments down to the generator
  // (but first, remove commander's extra argument)
  cliArguments.pop();
  scope.args = cliArguments;
  scope.generatorType = 'new';

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {

    // Log and exit the REPL in case there is an error
    // while we were trying to generate the new app.
    error: function returnError(err) {
      logger.error(err);
      process.exit(1);
    },

    // Log and exit the REPL in case of success
    // but first make sure we have an internet access
    // and we have all the info we need.
    success: function returnSuccess() {
      const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

      dns.lookup('studio.strapi.io', function (noInternetAccess) {
        if (noInternetAccess) {
          logger.warn('No internet access...');
          logger.warn('Your application can not be linked to the Strapi Studio.');
          process.exit(1);
        }

        // Read the `.strapirc` configuration file at $HOME.
        fs.readFile(path.resolve(HOME, '.strapirc'), 'utf8', function (noRcFile, config) {
          if (noRcFile) {
            logger.warn('You do not have a `.strapirc` file at `' + HOME + '`.');
            logger.warn('First, you need to create an account on http://studio.strapi.io/');
            logger.warn('Then, execute `$ strapi login` to start the experience.');
            process.exit(1);
          }

          // Parse the config file.
          config = JSON.parse(config);

          // Create a new application on the Strapi Studio.
          request({
            method: 'POST',
            preambleCRLF: true,
            postambleCRLF: true,
            json: true,
            uri: 'http://studio.strapi.io/app',
            body: {
              name: cliArguments[0],
              token: config.token
            }
          },

          // Callback.
          function (err, res) {

            // Log and exit if no internet access.
            if (err) {
              logger.warn('Impossible to access the Strapi Studio.');
              logger.warn('Your application is not linked to the Strapi Studio.');
              process.exit(1);
            }

            // Parse the RC file.
            const currentJSON = JSON.parse(fs.readFileSync(path.resolve('config', 'studio.json'), 'utf8'));
            const newJSON = JSON.stringify(_.merge(currentJSON, {studio: {appId: res.body.appId}}), null, '  ');

            // Write the new `./config/studio.json` with credentials.
            fs.writeFile(path.resolve('config', 'studio.json'), newJSON, 'utf8', function (err) {
              if (err) {
                logger.error('Impossible to write the `appId`.');
                process.exit(1);
              }

              process.exit(0);
            });
          });
        });
      });
    }
  });
};
