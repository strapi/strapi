'use strict';

const path = require('path');

module.exports = {
  preset: '../../../jest-preset.unit.js',
  displayName: 'Github action check-pr-status',
  moduleNameMapper: {
    '^@actions/github$': path.join(__dirname, '__tests__/github-mock.cjs'),
    '^@actions/core$': path.join(__dirname, '__tests__/core-mock.cjs'),
  },
};
