// @ts-check
const { devices } = require('@playwright/test');

const getEnvNum = (envVar, defaultValue) => {
  if (envVar !== undefined && envVar !== null) {
    return Number(envVar);
  }
  return defaultValue;
};

/**
 * @typedef ConfigOptions
 * @type {{ port: number; testDir: string; appDir: string }}
 */

/**
 * @see https://playwright.dev/docs/test-configuration
 * @type {(options: ConfigOptions) => import('@playwright/test').PlaywrightTestConfig}
 */
const createConfig = ({ port, testDir, appDir }) => ({
  testDir,

  /* default timeout for a jest test to 30s */
  timeout: getEnvNum(process.env.PLAYWRIGHT_TIMEOUT, 30 * 1000),

  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: getEnvNum(process.env.PLAYWRIGHT_EXPECT_TIMEOUT, 30 * 1000),
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://127.0.0.1:${port}`,

    /* Default time each action such as `click()` can take to 20s */
    actionTimeout: getEnvNum(process.env.PLAYWRIGHT_ACTION_TIMEOUT, 20 * 1000),

    /* Collect trace when a test failed on the CI. See https://playwright.dev/docs/trace-viewer
       Until https://github.com/strapi/strapi/issues/18196 is fixed we can't enable this locally,
       because the Strapi server restarts every time a new file (trace) is created.
    */
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `cd ${appDir} && npm run develop`,
    url: `http://127.0.0.1:${port}`,
    /* default Strapi server startup timeout to 160s */
    timeout: getEnvNum(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT, 160 * 1000),
    reuseExistingServer: true,
    stdout: 'pipe',
  },
});

module.exports = { createConfig };
