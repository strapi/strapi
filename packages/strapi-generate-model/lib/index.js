'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

/**
 * Generate a core API
 */

module.exports = {
  templatesDirectory: path.resolve(__dirname, '..', 'templates'),
  before: require('./before'),
  targets: {
    'api/:api/models/:filename': {
      template: 'model.template'
    },
    'api/:api/models/:filenameSettings': {
      template: 'model.settings.template'
    },
  }
};
