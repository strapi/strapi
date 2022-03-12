module.exports = {
  rootDir: __dirname,
  setupFilesAfterEnv: ['<rootDir>/test/unit.setup.js'],
  modulePathIgnorePatterns: ['.cache'],
  testMatch: ['/**/__tests__/**/*.[jt]s?(x)'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
