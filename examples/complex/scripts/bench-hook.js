#!/usr/bin/env node
/* eslint-disable no-console, global-require */

/**
 * Migration benchmark timing hook (Node `--require` preload).
 *
 * Captures per-migration start/end times by subscribing to Umzug's native
 * `migrating` / `migrated` events. Umzug is a stable public dep of Strapi
 * (currently 3.8.1); its event API is documented and unlikely to change,
 * so this is more durable than patching anything inside @strapi/database.
 *
 * Strategy:
 *   1. Patch Module._load so each `require('umzug')` returns a module whose
 *      `Umzug` export is a subclass that auto-attaches our listeners.
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
let umzugInstanceCount = 0;

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
    startedAt: Date.now() - durationMs, // wall-clock approximation
    durationMs,
  });
  debug(`recorded ${name}: ${durationMs.toFixed(2)}ms`);
  // Flush incrementally — some Strapi shutdown paths bypass exit handlers
  // (process.exit via signal or uncaught error), and we don't want to lose
  // timing data we already collected.
  flush();
}

/**
 * Extract a migration name from an Umzug event payload.
 * Umzug v3 emits `{name, path, context, ...}` — sometimes just the name in older shapes.
 */
function getMigrationName(event) {
  if (!event) return '<unknown>';
  if (typeof event === 'string') return event;
  if (typeof event.name === 'string') return event.name;
  return '<unknown>';
}

/**
 * Patch the Umzug prototype in place so every instance auto-attaches our
 * listeners the first time its `up()` runs. This avoids cache-aliasing issues
 * the subclass-then-replace-export approach would hit — Node caches the
 * original module object, so subsequent `require('umzug')` calls return the
 * original class from cache, not our subclass wrapper.
 */
function instrumentUmzugClass(Umzug) {
  if (!Umzug || typeof Umzug !== 'function' || Umzug.__strapiBenchHookPatched) {
    return false;
  }

  const originalUp = Umzug.prototype.up;
  if (typeof originalUp !== 'function') {
    debug('Umzug.prototype.up is not a function — cannot patch');
    return false;
  }

  Umzug.prototype.up = async function patchedUp(...args) {
    if (!this.__strapiBenchHookListeners) {
      this.__strapiBenchHookListeners = true;
      umzugInstanceCount += 1;
      try {
        this.on('migrating', (evt) => recordStart(getMigrationName(evt)));
        this.on('migrated', (evt) => recordEnd(getMigrationName(evt)));
        debug(`attached listeners to Umzug instance #${umzugInstanceCount}`);
      } catch (err) {
        debug('failed to attach listeners:', err.message);
      }
    }
    return originalUp.apply(this, args);
  };

  Object.defineProperty(Umzug, '__strapiBenchHookPatched', {
    value: true,
    enumerable: false,
  });

  return true;
}

/**
 * Intercept require('umzug') to patch the class the moment it's first loaded —
 * before Strapi calls `new Umzug(...)`. Since we mutate the class prototype
 * in place, subsequent loads that hit the cache still see the patched class.
 */
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, ...rest) {
  const mod = originalLoad.call(this, request, parent, ...rest);
  if (request === 'umzug' && mod && mod.Umzug && !mod.Umzug.__strapiBenchHookPatched) {
    const ok = instrumentUmzugClass(mod.Umzug);
    if (ok) debug('patched umzug class prototype');
  }
  return mod;
};

/**
 * Flush collected timings to disk. Sync write so we don't lose data if the
 * parent process exits immediately after Strapi finishes migrating.
 */
function flush() {
  const payload = {
    hookVersion: 1,
    instanceCount: umzugInstanceCount,
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
// Safety net — some Strapi boot failures call process.exit via uncaught errors.
process.on('SIGINT', () => {
  flush();
  process.exit(130);
});
process.on('SIGTERM', () => {
  flush();
  process.exit(143);
});

debug(`initialized — output: ${OUTPUT_PATH}`);
