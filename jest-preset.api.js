'use strict';

const path = require('path');

module.exports = {
  displayName: 'API integration tests',
  testMatch: ['**/?(*.)+(spec|test).api.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: [path.join(__dirname + '/test/jest-api.setup.js')],
  // coveragePathIgnorePatterns: ['/dist/', '/node_modules/', '/out-tsc/', '/test/'],
  // transform: {},
  // modulePathIgnorePatterns: ['.cache'],
};
