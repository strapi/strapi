'use strict';

module.exports = {
  rootDir: __dirname,
  setupFilesAfterEnv: ['<rootDir>/test/unit.setup.js'],
  modulePathIgnorePatterns: ['.cache', 'dist'],
  testPathIgnorePatterns: ['.testdata.js', '.test.utils.js'],
  // TODO: testMatch should only include files with (test|spec) even within __tests__ so that utilities can be included and ignored there
  testMatch: ['/**/__tests__/**/*.[jt]s?(x)'],
  // Use `jest-watch-typeahead` version 0.6.5. Newest version 1.0.0 does not support jest@26
  // Reference: https://github.com/jest-community/jest-watch-typeahead/releases/tag/v1.0.0
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
