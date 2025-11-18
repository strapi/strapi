'use strict';

// Export utilities for CLI tests
// Note: instances.getTestApps() is used by CLI tests
const testApp = require('./test-app');

module.exports = {
  fs: require('./fs'),
  seed: require('./scripts/dts-import'),
  instances: {
    getTestApps: testApp.getTestApps,
  },
  helpers: require('./helpers'),
};
