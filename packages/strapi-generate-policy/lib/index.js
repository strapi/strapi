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

    // Copy an empty JavaScript model where every functions will be.
    'api/:api/policies/:filename': {
      template: 'policy.template'
    }
  }
};
