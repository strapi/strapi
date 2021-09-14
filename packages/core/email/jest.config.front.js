'use strict'

const baseConfigFront = require('../../../jest.base-config.front')

module.exports = {
  displayName: 'email-front',
  rootDir: '../../..',
  ...baseConfigFront,
  testMatch: [`<rootDir>/packages/core/email${baseConfigFront.testMatch}`],
}