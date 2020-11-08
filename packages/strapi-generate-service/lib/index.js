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
      fs.accessSync(
        path.resolve(__dirname, '..', 'templates', scope.args.tpl),
        fs.constants.R_OK | fs.constants.W_OK
      );

      return path.resolve(__dirname, '..', 'templates', scope.args.tpl);
    } catch (e) {
      // Default template is Mongoose
      return path.resolve(__dirname, '..', 'templates', 'mongoose');
    }
  },
  before: require('./before'),
  targets: {
    ':filePath/:filename': {
      template: 'service.template',
    },
  },
};
