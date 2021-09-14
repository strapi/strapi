'use strict'

const baseConfigFront = require('../../../jest.base-config.front')

module.exports = {
  displayName: 'upload-front',
  rootDir: '../../..',
  ...baseConfigFront,
  testMatch: [`<rootDir>/packages/core/upload${baseConfigFront.testMatch}`],
}