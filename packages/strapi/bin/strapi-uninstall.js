#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi uninstall`
 *
 * Uninstall a Strapi plugin.
 */

module.exports = function (plugin) {
  // Define variables.
  const pluginPath = `./plugins/${plugin}`;

  // Check that the plugin is installed.
  if (!fs.existsSync(pluginPath)) {
    logger.error(`It looks like this plugin is not installed. Please check that \`${pluginPath}\` folder exists.`);
    process.exit(1);
  }

  // Delete the plugin folder.
  rimraf(pluginPath, (err) => {
    if (err) {
      logger.error('An error occurred during plugin uninstallation.');
      process.exit(1);
    }

    // Success.
    logger.info('The plugin has been successfully uninstalled.');
    process.exit(0);
  });
};
