'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  displayName: 'Strapi - OpenAPI',
  // Override root collectCoverageFrom so coverage is collected from this package when run via root jest (CI).
  // Root config uses <rootDir>/packages/** which resolves to packages/core/openapi/packages/** otherwise.
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.config.{js,ts,mjs}',
    '!**/jest*.{js,ts}',
    '!**/rollup*.{js,ts,mjs}',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
};
