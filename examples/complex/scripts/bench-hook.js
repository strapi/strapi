#!/usr/bin/env node
/* eslint-disable no-console, global-require */

/**
 * Migration benchmark timing hook (Node `--require` preload).
 *
 * Captures per-migration start/end times by wrapping Strapi's migration runner
 * logger events (`migrating` / `migrated`).
 *
 * Strategy:
 *   1. Patch Module._load so the first load of `@strapi/database`'s migration
 *      runner wraps `createMigrationRunner` and records logger events.
 *   2. Accumulate timings in a module-level array.
 *   3. On process exit, flush the array to STRAPI_BENCH_HOOK_OUTPUT (JSON).
 *
 * Activation:
 *   STRAPI_BENCH_HOOK_OUTPUT=/tmp/bench-$$.json \
 *     node --require /abs/path/to/bench-hook.js <strapi launcher>
 *
 * If STRAPI_BENCH_HOOK_OUTPUT is unset, the hook self-disables — cheap to
 * leave `--require` in dev configs without affecting normal runs.
 */

const fs = require('fs');
const Module = require('module');
const path = require('path');

const OUTPUT_PATH = process.env.STRAPI_BENCH_HOOK_OUTPUT;
const HOOK_DEBUG = process.env.STRAPI_BENCH_HOOK_DEBUG === '1';

function debug(...args) {
  if (HOOK_DEBUG) {
    console.error('[bench-hook]', ...args);
  }
}

if (!OUTPUT_PATH) {
  debug('STRAPI_BENCH_HOOK_OUTPUT not set — hook disabled');
  return;
}

/** @type {Array<{name: string, startedAt: number, durationMs: number}>} */
const migrations = [];

/** @type {Map<string, number>} */
const inflight = new Map();
let runnerInstanceCount = 0;

function recordStart(name) {
  inflight.set(name, performance.now());
}

function recordEnd(name) {
  const start = inflight.get(name);
  if (start == null) {
    debug(`migrated event without matching migrating event: ${name}`);
    return;
  }
  inflight.delete(name);
  const durationMs = performance.now() - start;
  migrations.push({
    name,
    startedAt: Date.now() - durationMs,
    durationMs,
  });
  debug(`recorded ${name}: ${durationMs.toFixed(2)}ms`);
  flush();
}

function instrumentMigrationRunner(createMigrationRunner) {
  if (!createMigrationRunner || createMigrationRunner.__strapiBenchHookPatched) {
    return createMigrationRunner;
  }

  const wrapped = (opts) => {
    runnerInstanceCount += 1;
    const originalInfo = opts.logger.info.bind(opts.logger);

    opts.logger.info = (message) => {
      if (message && typeof message === 'object') {
        if (message.event === 'migrating' && typeof message.name === 'string') {
          recordStart(message.name);
        }
        if (message.event === 'migrated' && typeof message.name === 'string') {
          recordEnd(message.name);
        }
      }

      return originalInfo(message);
    };

    debug(`wrapped migration runner #${runnerInstanceCount}`);
    return createMigrationRunner(opts);
  };

  Object.defineProperty(wrapped, '__strapiBenchHookPatched', {
    value: true,
    enumerable: false,
  });

  return wrapped;
}

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, ...rest) {
  const mod = originalLoad.call(this, request, parent, ...rest);

  if (typeof request !== 'string' || !mod || !mod.createMigrationRunner) {
    return mod;
  }

  let resolved;
  try {
    // Built CJS providers load via `require('./runner.js')`; match the resolved
    // absolute path, not the unresolved request string.
    resolved = Module._resolveFilename(request, parent);
  } catch {
    return mod;
  }

  const normalized = path.normalize(resolved);
  const isMigrationRunner =
    normalized.endsWith(`${path.sep}migrations${path.sep}runner.js`) ||
    normalized.endsWith(`${path.sep}migrations${path.sep}runner`);

  if (isMigrationRunner) {
    mod.createMigrationRunner = instrumentMigrationRunner(mod.createMigrationRunner);
    debug(`patched createMigrationRunner (${request} -> ${resolved})`);
  }

  return mod;
};

function flush() {
  const payload = {
    hookVersion: 2,
    instanceCount: runnerInstanceCount,
    migrations,
    capturedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
    debug(`flushed ${migrations.length} migration entries to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('[bench-hook] failed to write output:', err.message);
  }
}

process.on('exit', flush);
process.on('SIGINT', () => {
  flush();
  process.exit(130);
});
process.on('SIGTERM', () => {
  flush();
  process.exit(143);
});

debug(`initialized — output: ${OUTPUT_PATH}`);
