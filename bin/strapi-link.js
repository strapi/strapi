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
 * `$ strapi link`
 *
 * Link an existing application to the Strapi Studio
 */

module.exports = function () {
  const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
  const pathToPackageJSON = path.resolve(process.cwd(), 'package.json');
  const pathToStudioJSON = path.resolve(process.cwd(), 'config', 'studio.json');
  const appPkg = JSON.parse(fs.readFileSync(pathToPackageJSON));
  const studioConfig = JSON.parse(fs.readFileSync(pathToStudioJSON));
  let invalidPackageJSON;

  // First, check if we are in a Strapi project.
  try {
    require(pathToPackageJSON);
  } catch (err) {
    invalidPackageJSON = true;
  }

  if (invalidPackageJSON) {
    logger.error('This command can only be used inside an Strapi project.');
    process.exit(1);
  }

  // Check the internet connectivity.
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

      // Make sure the developer is logged in.
      if (_.isEmpty(config.email) || _.isEmpty(config.token)) {
        logger.error('You are not logged in.');
        logger.error('Execute `$ strapi login` to start the experience.');
        process.exit(1);
      }

      // Create a new application on the Strapi Studio.
      request({
        method: 'POST',
        preambleCRLF: true,
        postambleCRLF: true,
        json: true,
        uri: 'http://studio.strapi.io/app',
        body: {
          name: appPkg.name,
          token: config.token,
          appToDelete: studioConfig.studio.appId
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
          } else {
            logger.info('Your application has successfully been linked to the Studio.');
          }

          process.exit(0);
        });
      });
    });
  });
};
