'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  testMatch: ['<rootDir>/**/__tests__/*.test.ts'],
  displayName: 'Core content-type-builder',
  testEnvironment: 'jsdom',
};
