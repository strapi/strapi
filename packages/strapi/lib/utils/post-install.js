'use strict';

/**
 * Module dependencies
 */

// Node.js core
const path = require('path');
const fs = require('fs');

// Public node modules.
const _ = require('lodash');
const shell = require('shelljs');

// Define files/dir paths
const pluginsDirPath = path.join(process.cwd(), 'plugins');
const adminDirPath = path.join(process.cwd(), 'admin');

let packageManager;
try {
  packageManager = require(path.resolve(process.cwd(), 'package.json')).strapi.packageManager;
} catch (error) {
  packageManager = 'npm';
}

const installCmd = packageManager === 'yarn' ? 'yarn install --production --ignore-scripts' : 'npm install --prod --ignore-scripts';

/* eslint-disable no-console */

// Install admin dependencies
console.log(`🔸  Administration Panel`);
console.log('📦  Installing packages...');

try {
  // Check if path is existing.
  fs.accessSync(adminDirPath, fs.constants.R_OK | fs.constants.W_OK);

  shell.cd(adminDirPath);
  const install = shell.exec(installCmd, {silent: true});

  if (install.stderr && install.code !== 0) {
    console.error(install.stderr);
    process.exit(1);
  }

  console.log('✅  Success');
  console.log('');
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log('✅  Success');
    console.log('');

    return;
  }

  console.log(e);
}

try {
  // Check if path is existing.
  fs.accessSync(pluginsDirPath, fs.constants.R_OK | fs.constants.W_OK);

  const plugins = fs.readdirSync(pluginsDirPath).filter(x => x[0] !== '.');

  // Install dependencies for each plugins
  _.forEach(plugins, plugin => {
    const pluginPath = path.join(pluginsDirPath, plugin);

    console.log(`🔸  Plugin - ${_.upperFirst(plugin)}`);
    console.log('📦  Installing packages...');

    try {
      shell.cd(pluginPath);
      const install = shell.exec(installCmd, {silent: true});

      if (install.stderr && install.code !== 0) {
        console.error(install.stderr);
        process.exit(1);
      }

      console.log('✅  Success');
      console.log('');
    } catch (err) {
      console.log(err);
    }
  });
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log('✅  Success');
    console.log('');

    return;
  }

  console.log(e);
}
