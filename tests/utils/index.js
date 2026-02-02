'use strict';

// Export utilities for CLI tests
// Note: We lazy-load helpers to avoid importing heavy dependencies when Jest loads test files
const { getTestApps } = require('./get-test-apps');

// Lazy load helpers to avoid triggering imports of create-strapi-app
let helpersCache = null;
const getHelpers = () => {
  if (!helpersCache) {
    helpersCache = require('./helpers');
  }
  return helpersCache;
};

module.exports = {
  fs: require('./fs'),
  seed: require('./dts-import'),
  instances: {
    getTestApps,
  },
  get helpers() {
    return getHelpers();
  },
};
