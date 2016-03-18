'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

/**
 * Generate migration files
 */

module.exports = {
  templatesDirectory: path.resolve(__dirname, '..', 'templates'),
  before: require('./before'),
  after: require('./after'),
  targets: {
    'data/migrations/:connection/:filename': {
      template: 'migration.template'
    },
    'data/seeds/:connection/:filename': {
      template: 'seed.template'
    }
  }
};
