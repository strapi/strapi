'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  collectCoverageFrom: ['<rootDir>/packages/core/admin/admin/**/*.js'],
  displayName: 'Core content-manager',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
  },
  setupFilesAfterEnv: ['./admin/tests/setup.ts'],
};
