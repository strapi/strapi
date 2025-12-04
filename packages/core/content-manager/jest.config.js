'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  displayName: 'Core content-manager',
  moduleNameMapper: {
    '^@content-manager/admin/(.*)$': '<rootDir>/admin/src/$1',
    '^@content-manager/server/(.*)$': '<rootDir>/server/src/$1',
    '^@content-manager/shared/(.*)$': '<rootDir>/shared/$1',
  },
};
