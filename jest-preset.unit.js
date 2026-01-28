'use strict';

module.exports = {
  setupFilesAfterEnv: [__dirname + '/tests/setup/unit.setup.js'],
  modulePathIgnorePatterns: ['.cache', 'dist'],
  testPathIgnorePatterns: [
    '.testdata.{js,ts}',
    '.test.utils.{js,ts}',
    '.d.ts',
    '__tests__/resources',
    'tests/resources',
  ],
  prettierPath: require.resolve('prettier-2'),
  testMatch: ['**/__tests__/**/*.{js,ts,jsx,tsx}'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  // Use `jest-watch-typeahead` version 0.6.5. Newest version 1.0.0 does not support jest@26
  // Reference: https://github.com/jest-community/jest-watch-typeahead/releases/tag/v1.0.0
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],

  // Coverage configuration for SonarQube
  collectCoverage: false, // Will be enabled via CLI flag
  collectCoverageFrom: [
    '**/*.{js,ts,jsx,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts,mjs}',
    '!**/jest*.{js,ts}',
    '!**/rollup*.{js,ts,mjs}',
    '!**/babel*.{js,ts}',
    '!**/test/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/*.test.{js,ts,jsx,tsx}',
    '!**/*.spec.{js,ts,jsx,tsx}',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/test/',
    '<rootDir>/tests/',
    '<rootDir>/__tests__/',
    '<rootDir>/coverage/',
  ],
};
