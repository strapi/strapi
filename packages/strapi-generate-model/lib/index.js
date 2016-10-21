'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

/**
 * Generate a core API
 */

module.exports = {
  templatesDirectory: scope => {
    try {
      // Try to reach the path. If it fail, throw an error.
      fs.accessSync(path.resolve(__dirname, '..', 'templates', scope.template), fs.constants.R_OK | fs.constants.W_OK);

      return path.resolve(__dirname, '..', 'templates', scope.template);
    } catch (e) {
      // Default template is Mongoose
      return path.resolve(__dirname, '..', 'templates', 'mongoose');
    }
  },
  before: require('./before'),
  targets: {
    'api/:humanizeId/models/:filename': {
      template: 'model.template'
    },
    'api/:humanizeId/models/:filenameSettings': {
      template: 'model.settings.template'
    }
  }
};
