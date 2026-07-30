'use strict';

const execa = require('execa');

/**
 * Run Playwright test command.
 * Only pass runner-owned env keys; execa merges with process.env by default (extendEnv: true).
 */
const runPlaywright = async ({ configPath, cwd, port, testAppPath, testArgs }) => {
  // `STRAPI_DISABLE_EE` / `STRAPI_E2E_EDITION` come from `applyE2eEditionEnv()` in run-tests.js (after dotenv).
  await execa('yarn', ['playwright', 'test', '--config', configPath, ...testArgs], {
    stdio: 'inherit',
    cwd,
    env: {
      PORT: String(port),
      HOST: '127.0.0.1',
      TEST_APP_PATH: testAppPath,
    },
  });
};

module.exports = {
  runPlaywright,
};
