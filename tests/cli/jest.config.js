'use strict';

/** @type {import('jest').Config} */
const config = {
  displayName: 'CLI e2e tests',
  testMatch: ['**/?(*.)+(spec|test).(js|ts)'],
  testEnvironment: 'node',
  // setupFilesAfterEnv: ['<rootDir>/test/setup/jest-api.setup.js'],
  coveragePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/', '<rootDir>/out-tsc/'],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  modulePathIgnorePatterns: ['.cache'],
};

module.exports = config;
