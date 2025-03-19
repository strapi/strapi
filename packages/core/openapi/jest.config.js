'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  displayName: 'Strapi - OpenAPI',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
