'use strict';

// Re-export from helpers/test-app for shared-setup.js
const { cleanTestApp, generateTestApp, runTestApp } = require('../helpers/test-app');

const getTestApps = () => {
  return process.env.TEST_APPS.split(',');
};

module.exports = {
  getTestApps,
  cleanTestApp,
  generateTestApp,
  runTestApp,
};
