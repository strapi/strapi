'use strict';

/**
 * Spike (CMS-1943): time today's E2E reset on the same app, for comparison.
 *   node tests-next/shared/spike/baseline.js [--resets=10]
 *
 * Calls what resetDatabaseAndImportDataFromPath('with-admin') calls (POST /api/config/reset-fixture,
 * restored in process by the test app), then the API login every test does after it.
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const appDir = path.join(repoRoot, 'test-apps/e2e/test-app-0');
const resets = Number(
  (process.argv.find((a) => a.startsWith('--resets=')) || '--resets=10').split('=')[1]
);
const port = 8400;
const base = `http://127.0.0.1:${port}`;

const now = () => Number(process.hrtime.bigint()) / 1e6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = (url, body) =>
  fetch(`${base}${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

// Same list as tests/e2e/constants.ts ALLOWED_CONTENT_TYPES, minus the admin:: types the
// remote push protects (the in-app restore handles admin entities itself).
const includedTypes = [
  ...fs
    .readdirSync(path.join(repoRoot, 'tests/app-template/src/api'))
    .filter((name) =>
      fs.existsSync(path.join(repoRoot, 'tests/app-template/src/api', name, 'content-types', name))
    )
    .map((name) => `api::${name}.${name}`),
  'plugin::content-manager.history-version',
  'plugin::i18n.locale',
  'plugin::content-releases.release',
  'plugin::content-releases.release-action',
  'plugin::review-workflows.workflow-stage',
  'plugin::review-workflows.workflow',
  'plugin::upload.file',
  'plugin::upload.folder',
];

const main = async () => {
  const server = spawn('npx', ['strapi', 'develop', '--no-watch-admin', '--no-build-admin'], {
    cwd: appDir,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', BROWSER: 'none' },
    stdio: 'ignore',
    detached: true,
  });

  try {
    for (;;) {
      try {
        if ((await fetch(`${base}/_health`)).status === 204) break;
      } catch {
        // booting
      }
      await sleep(100);
    }

    const resetTimes = [];
    const totalTimes = [];
    for (let i = 0; i < resets; i += 1) {
      const start = now();
      const res = await post('/api/config/reset-fixture', {
        fixture: 'with-admin',
        includedTypes,
        configuration: { coreStore: true },
      });
      if (!res.ok) throw new Error(`reset-fixture: ${res.status} ${await res.text()}`);
      resetTimes.push(now() - start);

      const login = await post('/admin/login', {
        email: 'test@testing.com',
        password: 'Testing123!',
      });
      if (!login.ok) throw new Error(`login: ${login.status}`);
      totalTimes.push(now() - start);
      console.log(
        `[baseline] reset ${i + 1}: ${resetTimes[i].toFixed(0)} ms, + login ${totalTimes[i].toFixed(0)} ms`
      );
    }

    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    console.log(`[baseline] reset-fixture median: ${median(resetTimes).toFixed(0)} ms`);
    console.log(`[baseline] reset-fixture + login median: ${median(totalTimes).toFixed(0)} ms`);
  } finally {
    process.kill(-server.pid, 'SIGINT');
  }
};

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
