'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Local dependencies.
const packageJSON = require('../json/package.json.js');
const routesJSON = require('../json/routes.json.js');

/**
 * Generate a core API
 */

module.exports = {
  templatesDirectory: path.resolve(__dirname, '..', 'templates'),
  before: require('./before'),
  targets: {
    'plugins/:humanizeId/.gitignore': {
      copy: 'gitignore',
    },

    // Use the default `controller` file as a template for
    // every generated controller.
    'plugins/:humanizeId/controllers/:filename': {
      template: 'controller.template',
    },

    // every generated controller.
    'plugins/:humanizeId/services/:filename': {
      template: 'service.template',
    },

    // Generate routes.
    'plugins/:humanizeId/config/routes.json': {
      jsonfile: routesJSON,
    },

    // Main package.
    'plugins/:humanizeId/package.json': {
      jsonfile: packageJSON,
    },

    // Copy dot files.
    'plugins/:humanizeId/.editorconfig': {
      copy: 'editorconfig',
    },

    'plugins/:humanizeId/.gitattributes': {
      copy: 'gitattributes',
    },

    // Copy Markdown files with some information.
    'plugins/:humanizeId/README.md': {
      template: 'README.md',
    },
  },
};
