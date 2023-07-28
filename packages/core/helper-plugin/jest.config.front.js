module.exports = {
  preset: '../../../jest-preset.front.js',
  collectCoverageFrom: ['<rootDir>/packages/core/helper-plugin/src/**/*.js'],
  displayName: 'Helper plugin',
  moduleNameMapper: {
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  setupFilesAfterEnv: ['./tests/setup.js'],
};
