module.exports = {
  name: 'setup',
  displayName: 'Setup',
  testMatch: ['**/?(*.)+(spec|test).e2e.js'],
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {},
};
