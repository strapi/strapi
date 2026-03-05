'use strict';

const execa = require('execa');

/**
 * Run Playwright test command
 */
const runPlaywright = async ({ configPath, cwd, port, testAppPath, testArgs }) => {
  await execa('yarn', ['playwright', 'test', '--config', configPath, ...testArgs], {
    stdio: 'inherit',
    cwd,
    env: {
      PORT: port,
      HOST: '127.0.0.1',
      TEST_APP_PATH: testAppPath,
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
    },
  });
};

module.exports = {
  runPlaywright,
};
