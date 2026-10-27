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

/**
 * Count the tests Playwright would run for this config and arguments (shard, project),
 * without starting the app. Tests skipped at collection time (`test.describe.skip`, for
 * example edition- or suite-gated specs) don't count.
 *
 * Returns null when the count can't be determined, so callers run the domain anyway.
 */
const countRunnableTests = async ({ configPath, cwd, port, testAppPath, testArgs }) => {
  try {
    const { stdout } = await execa(
      'yarn',
      ['playwright', 'test', '--config', configPath, '--list', '--reporter=json', ...testArgs],
      { cwd, env: runnerEnv({ port, testAppPath }) }
    );
    const report = JSON.parse(stdout);

    if (report.errors?.length) {
      return null;
    }

    let runnable = 0;
    const walk = (suite) => {
      for (const spec of suite.specs ?? []) {
        runnable += spec.tests.filter((test) => test.expectedStatus !== 'skipped').length;
      }
      (suite.suites ?? []).forEach(walk);
    };
    (report.suites ?? []).forEach(walk);

    return runnable;
  } catch {
    return null;
  }
};

module.exports = {
  buildAdmin,
  countRunnableTests,
  runPlaywright,
};
