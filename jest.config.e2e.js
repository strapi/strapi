module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/__tests__/e2e/**/*.test.js'],
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.js'],
  globalSetup: 'jest-environment-puppeteer/setup',
  globalTeardown: 'jest-environment-puppeteer/teardown',
  testEnvironment: 'jest-environment-puppeteer',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/e2e',
        outputName: 'junit.xml',
      },
    ],
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage/e2e',
  collectCoverageFrom: ['**/src/**/*.js', '!**/node_modules/**', '!**/dist/**'],
};
