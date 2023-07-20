'use strict';

module.exports = {
  preset: '../../../jest-preset.front.js',
  transform: {
    '^.+\\.ts(x)?$': ['@swc/jest'],
  },
  displayName: 'Color picker plugin',
};
