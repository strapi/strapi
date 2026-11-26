#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Regression smoke for bench-hook.js.
 *
 * Proves the preload patches `createMigrationRunner` when loaded the way built
 * CJS providers do — `require('./runner.js')` — not only when the unresolved
 * request already ends with `/migrations/runner`.
 *
 * Usage (from examples/complex):
 *   yarn test:bench-hook
 *
 * Or:
 *   STRAPI_BENCH_HOOK_OUTPUT=/tmp/bench-hook-smoke.json \
 *     node --require ./scripts/bench-hook.js ./scripts/bench-hook-smoke.js
 */

const fs = require('fs');
const Module = require('module');
const os = require('os');
const path = require('path');

const OUTPUT_PATH = process.env.STRAPI_BENCH_HOOK_OUTPUT;
if (!OUTPUT_PATH) {
  console.error('[bench-hook-smoke] STRAPI_BENCH_HOOK_OUTPUT is required');
  process.exit(1);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-bench-hook-'));
const migrationsDir = path.join(tmpRoot, 'migrations');
fs.mkdirSync(migrationsDir, { recursive: true });

// Mimic packages/core/database/dist/migrations/runner.js
fs.writeFileSync(
  path.join(migrationsDir, 'runner.js'),
  `'use strict';
function createMigrationRunner(opts) {
  return {
    async up() {
      opts.logger.info({ event: 'migrating', name: '001-smoke.js' });
      opts.logger.info({ event: 'migrated', name: '001-smoke.js', durationSeconds: 0 });
    },
    async down() {},
    async pending() {
      return [];
    },
  };
}
module.exports = { createMigrationRunner };
`
);

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
  try {
    const runner = runnerMod.createMigrationRunner({
      logger: {
        info() {
          // no-op — hook wraps this
        },
      },
    });

    await runner.up();

    const payload = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    const recorded = payload.migrations?.find((m) => m.name === '001-smoke.js');

    if (!recorded) {
      console.error('[bench-hook-smoke] expected 001-smoke.js timing entry, got:', payload);
      process.exit(1);
    }

    console.log(
      '[bench-hook-smoke] ok — patched relative require("./runner.js") and recorded migration timing'
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[bench-hook-smoke] failed:', err);
  process.exit(1);
});
