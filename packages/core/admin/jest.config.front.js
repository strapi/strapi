'use strict'

const baseConfigFront = require('../../../jest.base-config.front')

module.exports = {
  displayName: 'admin-front',
  rootDir: '../../..',
  ...baseConfigFront,
  testMatch: [`<rootDir>/packages/core/admin${baseConfigFront.testMatch}`],
}