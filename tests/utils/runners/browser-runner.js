'use strict';

const execa = require('execa');

/**
 * Run Playwright test command.
 * Only pass runner-owned env keys; execa merges with process.env by default (extendEnv: true).
 */
const runPlaywright = async ({ configPath, cwd, port, testAppPath, testArgs }) => {
  await execa('yarn', ['playwright', 'test', '--config', configPath, ...testArgs], {
    stdio: 'inherit',
    cwd,
    env: {
      PORT: String(port),
      HOST: '127.0.0.1',
      TEST_APP_PATH: testAppPath,
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
    },
  });
};

module.exports = {
  runPlaywright,
};
