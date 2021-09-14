const baseConfigFront = require('./jest.base-config.front');

module.exports = {
  ...baseConfigFront,
  projects: [
    '<rootDir>/packages/core/admin/jest.config.front.js',
    '<rootDir>/packages/core/content-manager/jest.config.front.js',
    '<rootDir>/packages/core/content-type-builder/jest.config.front.js',
    '<rootDir>/packages/core/upload/jest.config.front.js',
    '<rootDir>/packages/core/email/jest.config.front.js',
    '<rootDir>/packages/plugins/*/jest.config.front.js',
  ],
};
