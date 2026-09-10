'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  displayName: 'Spaces plugin',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
  },
};
