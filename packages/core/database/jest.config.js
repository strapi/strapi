'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'database',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/database${baseConfig.testMatch}`]
}
