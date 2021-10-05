const baseConfig = require('./jest.base-config.front');

module.exports = {
  ...baseConfig,
  projects: ['<rootDir>/packages/**/jest.config.front.js'],
};
