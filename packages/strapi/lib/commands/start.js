#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const strapi = require('../strapi');

// Public dependencies
const _ = require('lodash');
const { cyan } = require('chalk');

// Logger.
const { cli } = require('strapi-utils');

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */
module.exports = function(appPath = '') {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`
    );
  }

  appPath = path.join(process.cwd(), appPath);

  strapi({ appPath }).start();
};
