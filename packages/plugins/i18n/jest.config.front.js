'use strict'

const baseConfigFront = require('../../../jest.base-config.front')

module.exports = {
  displayName: 'plugins-i18n-front',
  rootDir: '../../..',
  ...baseConfigFront,
  testMatch: [`<rootDir>/packages/plugins/i18n${baseConfigFront.testMatch}`],
}
