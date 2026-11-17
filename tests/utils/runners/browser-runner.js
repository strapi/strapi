'use strict';

const execa = require('execa');

const runnerEnv = ({ port, testAppPath }) => ({
  PORT: String(port),
  HOST: '127.0.0.1',
  TEST_APP_PATH: testAppPath,
});

/**
 * Run Playwright test command.
 * Only pass runner-owned env keys; execa merges with process.env by default (extendEnv: true).
 */
const runPlaywright = async ({ configPath, cwd, port, testAppPath, testArgs }) => {
  // `STRAPI_DISABLE_EE` / `STRAPI_E2E_EDITION` come from `applyE2eEditionEnv()` in run-tests.js (after dotenv).
  await execa('yarn', ['playwright', 'test', '--config', configPath, ...testArgs], {
    stdio: 'inherit',
    cwd,
    env: runnerEnv({ port, testAppPath }),
  });
};

/**
 * Build the admin panel of a test app once. Every domain then starts the app with
 * `--no-build-admin` (see playwright.base.config.js) instead of rebuilding the same
 * bundle on each start.
 */
const buildAdmin = async ({ testAppPath }) => {
  console.log(`Building the admin panel once for: ${testAppPath}`);
  await execa('npm', ['run', 'build'], {
    stdio: 'inherit',
    cwd: testAppPath,
  });
};

module.exports = {
  buildAdmin,
  runPlaywright,
};
