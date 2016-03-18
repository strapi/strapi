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
  templatesDirectory: path.resolve(__dirname, '..', 'templates'),
  before: require('./before'),
  targets: {

    // Use the default `controller` file as a template for
    // every generated controller.
    'api/:id/controllers/:filename': {
      template: 'controller.template'
    },

    // every generated controller.
    'api/:id/services/:filename': {
      template: 'service.template'
    },

    // Copy an empty JavaScript model where every functions will be.
    'api/:id/models/:filename': {
      template: 'model.template'
    },

    // Copy the generated JSON model for the connection,
    // schema and attributes.
    'api/:id/models/:filenameSettings': {
      template: 'model.settings.template'
    },

    // Generate routes.
    'api/:id/config/routes.json': {
      jsonfile: routesJSON
    }
  }
};
