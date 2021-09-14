'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'utils',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/utils${baseConfig.testMatch}`]
}
