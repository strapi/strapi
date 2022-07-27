module.exports = {
  displayName: 'API integration tests',
  testMatch: ['**/?(*.)+(spec|test).e2e.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest2e2.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/packages/core/database.old'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {},
  modulePathIgnorePatterns: ['.cache'],
};
