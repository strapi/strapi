'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'admin',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/admin${baseConfig.testMatch}`]
}