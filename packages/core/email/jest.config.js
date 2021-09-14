'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'email',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/email${baseConfig.testMatch}`]
}