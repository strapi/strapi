'use strict';

const execa = require('execa');

/**
 * Piwi groups results by run label, and only Playwright's own `--shard` metadata lets processes
 * that share a label form one run. This runner starts one Playwright process per domain (and per
 * planned file list), often side by side and with `--shard` removed, so processes that share the
 * CI label would cancel each other's live run on the dashboard. Each process gets its own label
 * instead: the CI label, then the job's shard, the domain and the lane.
 * Returns undefined when no CI label is set, so the reporter keeps its own default.
 */
const piwiRunLabel = ({ baseLabel, shard, domain, lane }) => {
  if (!baseLabel) {
    return undefined;
  }

  const parts = [baseLabel];
  if (shard) {
    parts.push(`shard${shard.index}of${shard.total}`);
  }
  parts.push(domain, `lane${lane}`);

  return parts.join('-');
};

const runnerEnv = ({ port, testAppPath, runLabel }) => ({
  PORT: String(port),
  HOST: '127.0.0.1',
  TEST_APP_PATH: testAppPath,
  ...(runLabel ? { PIWI_RUN_LABEL: runLabel } : {}),
});

/**
 * Run Playwright test command.
 * Only pass runner-owned env keys; execa merges with process.env by default (extendEnv: true).
 */
const runPlaywright = async ({ configPath, cwd, port, testAppPath, testArgs, runLabel }) => {
  // `STRAPI_DISABLE_EE` / `STRAPI_E2E_EDITION` come from `applyE2eEditionEnv()` in run-tests.js (after dotenv).
  await execa('yarn', ['playwright', 'test', '--config', configPath, ...testArgs], {
    stdio: 'inherit',
    cwd,
    env: runnerEnv({ port, testAppPath, runLabel }),
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
  piwiRunLabel,
  runPlaywright,
};
