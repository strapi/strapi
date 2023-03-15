'use strict';

module.exports = {
  rootDir: __dirname,
  setupFilesAfterEnv: [__dirname + '/test/unit.setup.js'],
  modulePathIgnorePatterns: ['.cache', 'dist'],
  testMatch: ['/**/__tests__/**/*.test.[jt]s?(x)'],
  // Use `jest-watch-typeahead` version 0.6.5. Newest version 1.0.0 does not support jest@26
  // Reference: https://github.com/jest-community/jest-watch-typeahead/releases/tag/v1.0.0
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
