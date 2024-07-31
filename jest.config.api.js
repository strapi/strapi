'use strict';

module.exports = {
  displayName: 'API integration tests',
  testMatch: ['**/?(*.)+(spec|test).api.(js|ts)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-api.setup.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  modulePathIgnorePatterns: ['.cache'],
};
