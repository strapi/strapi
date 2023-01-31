'use strict';

module.exports = {
  displayName: 'API integration tests',
  testMatch: ['**/?(*.)+(spec|test).api.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest-api.setup.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  globalSetup: '<rootDir>/test/jest-api.global-setup.js',
  globalTeardown: '<rootDir>/test/jest-api.teardown-setup.js',
  transform: {},
  modulePathIgnorePatterns: ['.cache'],
};
