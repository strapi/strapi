'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  displayName: 'End users plugin',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
  },
  setupFilesAfterEnv: ['./admin/tests/setup.ts'],
};
