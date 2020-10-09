module.exports = {
  name: 'API integration tests',
  testMatch: ['**/?(*.)+(spec|test).e2e.js'],
  testEnvironment: '<rootDir>/test/jest-environment/test-environment',
  setupFilesAfterEnv: ['<rootDir>/test/jest2e2.setup.js'],
  coveragePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/out-tsc/',
    '<rootDir>/test/',
  ],
  transform: {},
  modulePathIgnorePatterns: ['.cache'],
};
