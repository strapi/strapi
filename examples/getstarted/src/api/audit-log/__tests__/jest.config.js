module.exports = {
  displayName: 'Audit Logs API Tests',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '../**/*.js',
    '../../index.js',
    '!**/__tests__/**',
    '!**/*.config.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  testTimeout: 30000,
  verbose: true,
};
