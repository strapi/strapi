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
    ':filePath/:filename': {
      template: 'model.template',
    },
    ':filePath/:filenameSettings': {
      template: 'model.settings.template',
    },
  },
};
