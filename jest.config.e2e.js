module.exports = {
  name: 'Api integration tests',
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
