'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'upload',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/upload${baseConfig.testMatch}`]
}