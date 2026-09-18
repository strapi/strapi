/** @type {import('jest').Config} */
module.exports = {
  displayName: 'migration-fixture',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.{js,ts}'],
  rootDir: __dirname,
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
};
