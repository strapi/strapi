module.exports = {
  name: 'setup',
  displayName: 'Setup',
  testMatch: ['**/test/?(*.)+(spec|test).js'],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/globalSetup.js',
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
};
