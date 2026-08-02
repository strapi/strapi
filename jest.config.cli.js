// @ts-check
'use strict';

/** @type {import('jest').Config} */
const config = {
  displayName: 'CLI tests',
  testMatch: ['**/?(*.)+(spec|test).cli.(js|ts)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../../../../tests/setup/jest-cli.setup.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {
    '^.+\\.ts$': ['@swc/jest', {}],
  },
  modulePathIgnorePatterns: ['[/\\\\]\\.cache[/\\\\]', '[/\\\\]dist[/\\\\]'],
};

module.exports = config;
