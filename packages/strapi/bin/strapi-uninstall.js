#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const rimraf = require('rimraf');

// Logger.
const { cli, logger } = require('strapi-utils');

/**
 * `$ strapi uninstall`
 *
 * Uninstall a Strapi plugin.
 */

module.exports = function (plugin) {
  // Define variables.
  const pluginPath = `./plugins/${plugin}`;

  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return logger.error('This command can only be used inside a Strapi project.');
  }

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
