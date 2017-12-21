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
const plugins = fs.readdirSync(pluginsDirPath).filter(x => x[0] !== '.');

// Install dependencies for each plugins
_.forEach(plugins, plugin => {
  const pluginPath = path.join(pluginsDirPath, plugin);

  console.log(`📦  Installing ${_.upperFirst(plugin)} (plugin) packages...`);

  try {
    const install = exec(`cd ${pluginPath} && npm install --prod --ignore-scripts`, {
      silent: true
    });

    if (install.stderr) {
      console.error(install.stderr);
    }
  } catch (err) {
    console.log(err);
  }
});

// Install admin dependencies
console.log(`📦  Installing admin packages...`);

try {
  const install = exec(`cd ${adminDirPath} && npm install --prod --ignore-scripts`, {
    silent: true
  });

  if (install.stderr) {
    console.error(build.stderr);
  }
} catch (err) {
  console.log(err);
}
