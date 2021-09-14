const baseConfig = require('../../../jest.base-config')

module.exports = {
  displayName: 'helper-plugin',
  ...baseConfig,
  rootDir: '../../..',
  testMatch: [`<rootDir>/packages/core/helper-plugin${baseConfig.testMatch}`]
}
