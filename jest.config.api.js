'use strict';

module.exports = {
  displayName: 'API integration tests',
  testMatch: ['**/?(*.)+(spec|test).api.(js|ts)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-api.setup.js'],
  // Coverage configuration for SonarQube
  collectCoverage: false, // Will be enabled via CLI flag
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts,mjs}',
    '!**/jest*.{js,ts}',
    '!**/test/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
    '<rootDir>/tests/',
    '<rootDir>/__tests__/',
    '<rootDir>/coverage/',
  ],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  modulePathIgnorePatterns: [
    '[/\\\\]\\.cache[/\\\\]',
    '[/\\\\]dist[/\\\\]',
    // A generated e2e app keeps real copies of the packages under `.yalc`,
    // which the module map reads as a second `@strapi/core`; the API tests
    // never load those apps.
    '[/\\\\]test-apps[/\\\\]e2e[/\\\\]',
  ],
};
