'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  displayName: 'Core data-transfer',
};
