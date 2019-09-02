module.exports = {
  name: 'setup',
  displayName: 'Setup',
  testMatch: ['**/test/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['<rootDir>/packages/'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {},
};
