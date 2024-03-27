'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  collectCoverageFrom: ['<rootDir>/packages/core/review-workflows/admin/**/*.js'],
  displayName: 'Core review workflows',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
  },
  setupFilesAfterEnv: ['./admin/tests/setup.ts'],
};
