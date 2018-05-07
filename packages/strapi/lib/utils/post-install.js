'use strict';

/**
 * Module dependencies
 */

// Node.js core
const exec = require('child_process').execSync;
const path = require('path');
const fs = require('fs');

// Public node modules.
const _ = require('lodash');

// Define files/dir paths
const pluginsDirPath = path.join(process.cwd(), 'plugins');
const adminDirPath = path.join(process.cwd(), 'admin');

/* eslint-disable no-console */

// Install admin dependencies
console.log(`🔸  Administration Panel`);
console.log('📦  Installing packages...');

try {
  // Check if path is existing.
  fs.accessSync(adminDirPath, fs.constants.R_OK | fs.constants.W_OK);

  const install = exec(`cd "${adminDirPath}" && npm install --prod --ignore-scripts`, {
    silent: true
  });

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
      const install = exec(`cd "${pluginPath}" && npm install --prod --ignore-scripts`, {
        silent: true
      });

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
