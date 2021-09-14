'use strict'

const baseConfigFront = require('../../../jest.base-config.front')

module.exports = {
  displayName: 'plugins-graphql-front',
  rootDir: '../../..',
  ...baseConfigFront,
  testMatch: [`<rootDir>/packages/plugins/graphql${baseConfigFront.testMatch}`],
}
