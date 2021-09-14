'use strict'

const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'strapi',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/strapi${baseConfig.testMatch}`]
}
