'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Local dependencies.
const routesJSON = require('../json/routes.json.js');

/**
 * Generate a core API
 */

module.exports = {
  templatesDirectory: () => {
    return path.resolve(__dirname, '..', 'templates');
  },
  before: require('./before'),
  targets: {

    // Use the default `controller` file as a template for
    // every generated controller.
    'plugins/:humanizeId/controllers/:filename': {
      template: 'controller.template'
    },

    // every generated controller.
    'plugins/:humanizeId/services/:filename': {
      template: 'service.template'
    },

    // Generate routes.
    'plugins/:humanizeId/config/routes.json': {
      jsonfile: routesJSON
    }
  }
};
