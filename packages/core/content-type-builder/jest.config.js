'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'content-type-builder',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/content-type-builder${baseConfig.testMatch}`]
}