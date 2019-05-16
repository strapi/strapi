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
    // '.': ['admin'],

    // Main package.
    'package.json': {
      jsonfile: packageJSON
    },

    'config/environments/development/database.json': {
      jsonfile: database
    },

    'config/environments/production/database.json': {
      jsonfile: database
    },

    'config/environments/staging/database.json': {
      jsonfile: database
    },

    // Copy dot files.
    '.editorconfig': {
      copy: 'editorconfig'
    },
    '.gitignore': {
      copy: 'gitignore'
    },

    // Copy Markdown files with some information.
    'README.md': {
      template: 'README.md'
    },

    // Empty API directory.
    'api': {
      folder: {}
    },

    'api/.gitkeep': {
      copy: 'gitkeep'
    },

    // Empty plugins directory.
    'extensions': {
      folder: {}
    },
    
    'extensions/.gitkeep': {
      copy: 'gitkeep'
    },

    // Empty public directory.
    'public': {
      folder: {}
    },

    // Empty public directory.
    'public/uploads': {
      folder: {}
    },
    // Copy gitkeep into uploads directory.
    'public/uploads/.gitkeep': {
      copy: 'gitkeep'
    },
    // Empty node_modules directory.
    'node_modules': {
      folder: {}
    }
  }
};
