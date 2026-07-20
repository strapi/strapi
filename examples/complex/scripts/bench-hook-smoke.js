#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Smoke: prove bench-hook patches createMigrationRunner when the built CJS
 * providers load it via `require('./runner.js')` (unresolved relative request).
 *
 * Prerequisites:
 *   yarn nx build @strapi/database
 *
 * Usage (from examples/complex):
 *   STRAPI_BENCH_HOOK_OUTPUT=/tmp/bench-hook-smoke.json \
 *     node --require ./scripts/bench-hook.js ./scripts/bench-hook-smoke.js
 */

const fs = require('fs');
const Module = require('module');
const path = require('path');

const OUTPUT_PATH = process.env.STRAPI_BENCH_HOOK_OUTPUT;
if (!OUTPUT_PATH) {
  console.error('[bench-hook-smoke] STRAPI_BENCH_HOOK_OUTPUT is required');
  process.exit(1);
}

const runnerPath = path.resolve(
  __dirname,
  '../../../packages/core/database/dist/migrations/runner.js'
);

if (!fs.existsSync(runnerPath)) {
  console.error(
    `[bench-hook-smoke] missing built runner at ${runnerPath}\n` +
      'Build first: yarn nx build @strapi/database'
  );
  process.exit(1);
}

const migrationsDir = path.dirname(runnerPath);
const parent = new Module(path.join(migrationsDir, 'users.js'), module);
parent.filename = path.join(migrationsDir, 'users.js');
parent.paths = Module._nodeModulePaths(migrationsDir);

// Mimic built users.js / internal.js: require('./runner.js')
const runnerMod = parent.require('./runner.js');

if (typeof runnerMod.createMigrationRunner !== 'function') {
  console.error('[bench-hook-smoke] createMigrationRunner export missing');
  process.exit(1);
}

if (!runnerMod.createMigrationRunner.__strapiBenchHookPatched) {
  console.error(
    '[bench-hook-smoke] createMigrationRunner was not patched — relative require("./runner.js") still missed by the hook'
  );
  process.exit(1);
}

async function main() {
  const runner = runnerMod.createMigrationRunner({
    storage: {
      executed: async () => [],
      logMigration: async () => undefined,
      unlogMigration: async () => undefined,
    },
    logger: {
      info() {
        // no-op — hook wraps this
      },
    },
    getMigrations: async () => [
      {
        name: '001-smoke.js',
        up: async () => undefined,
        down: async () => undefined,
      },
    ],
  });

  await runner.up();

  const payload = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  const recorded = payload.migrations?.find((m) => m.name === '001-smoke.js');

  if (!recorded) {
    console.error('[bench-hook-smoke] expected 001-smoke.js timing entry, got:', payload);
    process.exit(1);
  }

  console.log('[bench-hook-smoke] ok — patched relative require and recorded migration timing');
}

main().catch((err) => {
  console.error('[bench-hook-smoke] failed:', err);
  process.exit(1);
});
