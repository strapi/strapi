#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const fs = require('fs-extra');

// Public
const {cyan} = require('chalk');
const ora = require('ora');
const shell = require('shelljs');

// Logger.
const { cli, packageManager } = require('strapi-utils');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

/**
 * `$ strapi install`
 *
 * Install a Strapi plugin.
 */

module.exports = function (plugin, cliArguments) {
  // Define variables.
  const pluginPrefix = 'strapi-plugin-';
  const pluginID = `${pluginPrefix}${plugin}`;
  const pluginPath = `./plugins/${plugin}`;

  let loader = ora(`Install ${cyan(plugin)} plugin`).start();

  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return loader.fail('This command can only be used inside a Strapi project.');
  }

  // Check that the plugin is not installed yet.
  if (fs.existsSync(pluginPath)) {
    loader.fail(`It looks like this plugin is already installed. Please check in \`${cyan(pluginPath)}\`.`);
    process.exit(1);
  }

  if (cliArguments.dev) {
    try {
      fs.symlinkSync(path.resolve(__dirname, '..', '..', pluginID), path.resolve(process.cwd(), pluginPath), 'dir');

      loader.succeed(`The ${cyan(plugin)} plugin has been successfully installed.`);
      process.exit(0);
    } catch (e) {
      console.log(e);
      loader.fail('An error occurred during plugin installation.');
      process.exit(1);
    }
  } else {
    // Install the plugin from the npm registry.
    const isStrapiInstalledWithNPM = packageManager.isStrapiInstalledWithNPM();

    if (!isStrapiInstalledWithNPM) {
      // Create the directory yarn doesn't do it it
      shell.mkdir('-p', [pluginPath]);
      // Add a package.json so it installs the dependencies
      shell.touch(`${pluginPath}/package.json`);
      fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify({}), 'utf8');
    }

    const cmd = isStrapiInstalledWithNPM ? `npm install ${pluginID}@${packageJSON.version} --ignore-scripts --no-save --prefix ${pluginPath}` : `yarn --cwd ${pluginPath} add ${pluginID}@${packageJSON.version} --ignore-scripts --no-save`;
    shell.exec(cmd, {silent: true}, (code) => {
      if (code) {
        loader.fail(`An error occurred during plugin installation. \nPlease make sure this plugin is available on npm: https://www.npmjs.com/package/${pluginID}`);
        process.exit(1);
      }

      // Remove the created package.json needed for yarn
      if (!isStrapiInstalledWithNPM) {
        shell.rm('-r', `${pluginPath}/package.json`);
      }

      try {
        // Move the plugin from the `node_modules` folder to the `./plugins` folder.
        fs.copySync(`${pluginPath}/node_modules/${pluginID}`, pluginPath, {
          overwrite: true,
          dereference: true,
        });
        // Copy .gitignore because the file is ignored during `npm publish`
        // and we need it to build the plugin.
        try {
          fs.accessSync(path.join(pluginPath, '.gitignore'));
        } catch (err) {
          if (err.code === 'ENOENT') {
            if (process.mainModule.filename.indexOf('yarn') !== -1) {
              fs.copySync(path.resolve(__dirname, '..', '..', 'strapi-generate-plugin', 'templates', 'gitignore'), path.join(pluginPath, '.gitignore'));
            } else {
              fs.copySync(path.resolve(__dirname, '..', 'node_modules', 'strapi-generate-plugin', 'templates', 'gitignore'), path.join(pluginPath, '.gitignore'));
            }
          }
        }

        // Success.
        loader.succeed(`The ${cyan(plugin)} plugin has been successfully installed.`);
        process.exit(0);
      } catch (err) {
        loader.fail('An error occurred during plugin installation.');
        process.exit(1);
      }
    });
  }
};
