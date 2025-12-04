'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  collectCoverageFrom: ['<rootDir>/packages/core/admin/admin/**/*.js'],
  displayName: 'Core content-manager',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
    '^@content-manager/admin/(.*)$': '<rootDir>/admin/src/$1',
    '^@content-manager/server/(.*)$': '<rootDir>/server/src/$1',
    '^@content-manager/shared/(.*)$': '<rootDir>/shared/$1',
  },
  setupFilesAfterEnv: ['./admin/tests/setup.ts'],
};
