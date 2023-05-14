'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  displayName: 'Mailgun email provider',
};
