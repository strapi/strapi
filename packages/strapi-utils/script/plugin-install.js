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
const plugins = fs.readdirSync(pluginsDirPath);

// Install dependencies for each plugins
_.forEach(plugins, plugin => {
  const pluginPath = path.join(pluginsDirPath, plugin);

  console.log(`Install plugin ${plugin} dependencies...`);

  try {
    exec(`cd ${pluginPath} && npm install --prod --ignore-scripts`);
  } catch (err) {
    console.log(err);
  }
});
