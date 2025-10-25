const baseConfig = require('../../../jest.base-config');

module.exports = {
  ...baseConfig,
  displayName: 'Audit Logging Plugin',
  roots: ['<rootDir>/server/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    '!server/src/**/*.test.ts',
    '!server/src/**/__tests__/**',
  ],
};