'use strict';

module.exports = {
  name: 'Unit test',
  testMatch: ['<rootDir>/packages/**/__tests__/?(*.)+(spec|test).js'],
  modulePathIgnorePatterns: ['.cache'],
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/test/unit.setup.js'],
};
