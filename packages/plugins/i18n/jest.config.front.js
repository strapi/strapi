'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  displayName: 'I18N plugin',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
  },
  setupFilesAfterEnv: ['./admin/tests/setup.ts'],
};
