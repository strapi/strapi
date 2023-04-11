'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
};
