'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'content-manager',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/content-manager${baseConfig.testMatch}`]
}