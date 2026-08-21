'use strict';

const frontPreset = require('../../../jest-preset.front');

const esmDependencies = [
  'file-type',
  'strtok3',
  'token-types',
  'uint8array-extras',
  '@tokenizer',
  '@borewit',
];

module.exports = {
  preset: '../../../jest-preset.front.js',
  displayName: 'Core upload',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/admin/tests/$1',
  },
  setupFilesAfterEnv: ['./admin/tests/setup.ts'],
  // file-type (and its tokenizer stack) is ESM-only; Jest must transform it to sniff bytes in admin tests.
  transformIgnorePatterns: [
    frontPreset.transformIgnorePatterns[0].replace(')/)', `|${esmDependencies.join('|')})/)`),
  ],
};
