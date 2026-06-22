'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  moduleNameMapper: {
    '^@strapi/utils$': '<rootDir>/../utils/src/index.ts',
  },
  testMatch: ['<rootDir>/**/*.test.ts'],
  displayName: 'Core Strapi',
};
