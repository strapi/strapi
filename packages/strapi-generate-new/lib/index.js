'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Local dependencies.
const packageJSON = require('../json/package.json.js');
const database = require('../json/database.json.js');

/**
 * Copy required files for the generated application
 */

module.exports = {
  moduleDir: path.resolve(__dirname, '..'),
  templatesDirectory: path.resolve(__dirname, '..', 'templates'),
  before: require('./before'),
  after: require('./after'),
  targets: {

    // Call the `admin` generator.
    '.': ['admin'],

    // Main package.
    'package.json': {
      jsonfile: packageJSON
    },

    'config/environments/development/database.json': {
      jsonfile: database
    },

    // Copy dot files.
    '.editorconfig': {
      copy: 'editorconfig'
    },
    '.npmignore': {
      copy: 'npmignore'
    },
    '.gitignore': {
      copy: 'gitignore'
    },

    // Copy Markdown files with some information.
    'README.md': {
      template: 'CLI.md'
    },

    // Empty API directory.
    'api': {
      folder: {}
    },

    // Empty plugins directory.
    'plugins': {
      folder: {}
    },

    // Empty public directory.
    'public': {
      folder: {}
    },

    // Empty public directory.
    'public/uploads': {
      folder: {}
    },

    // Empty node_modules directory.
    'node_modules': {
      folder: {}
    }
  }
};
