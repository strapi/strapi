'use strict';

// Opt-in diagnostics for API test helpers, off unless an environment variable names a file:
// - API_TEST_PROFILE: one JSON line per timed phase (boots, helper calls, builder steps).
// - API_TEST_SNAPSHOT: one JSON line per test-owned boot with the state the test starts from.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const file = process.env.API_TEST_PROFILE;

const currentTestPath = () => {
  try {
    // eslint-disable-next-line no-undef
    return expect.getState().testPath;
  } catch {
    return undefined;
  }
};

const record = (phase, ms, extra = {}) => {
  if (!file) return;
  fs.appendFileSync(
    file,
    `${JSON.stringify({ phase, ms: Math.round(ms), file: currentTestPath(), ...extra })}\n`
  );
};

const timed = async (phase, fn, extra) => {
  if (!file) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    record(phase, performance.now() - start, extra);
  }
};

const snapshotFile = process.env.API_TEST_SNAPSHOT;

const hashTree = (dir, root = dir, out = {}) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    // The documentation plugin regenerates this file with a timestamp on every boot.
    if (rel.startsWith(path.join('extensions', 'documentation'))) continue;
    if (entry.isDirectory()) hashTree(full, root, out);
    else out[rel] = crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex');
  }
  return out;
};

/**
 * Records what a test's own instance starts from: the app's schema files, the database schema
 * and the row count of every table. Comparing two runs shows whether a helper change altered
 * the state a test sees. SQLite only.
 */
const snapshotTestBoot = async (instance) => {
  const connection = instance.db.connection;
  const tables = await connection('sqlite_master')
    .select('type', 'name', 'sql')
    .whereNot('name', 'like', 'sqlite_%')
    .orderBy('name');
  const counts = {};
  for (const { type, name } of tables) {
    if (type === 'table') {
      const [{ n }] = await connection(name).count({ n: '*' });
      counts[name] = Number(n);
    }
  }
  fs.appendFileSync(
    snapshotFile,
    `${JSON.stringify({
      file: currentTestPath(),
      src: hashTree(instance.dirs.app.src),
      schema: tables.map(({ type, name, sql }) => `${type} ${name} ${sql}`),
      counts,
    })}\n`
  );
};

/**
 * Times the phases of a Strapi boot: register, bootstrap and its main parts, each module's
 * bootstrap, and destroy.
 */
const instrumentInstance = (instance) => {
  if (snapshotFile && !new Error().stack.includes(`api-tests${path.sep}models.js`)) {
    const originalLoad = instance.load.bind(instance);
    instance.load = async () => {
      const result = await originalLoad();
      await snapshotTestBoot(instance);
      return result;
    };
  }

  if (!file) return;

  const wrap = (obj, key, phase) => {
    const original = obj[key].bind(obj);
    obj[key] = (...args) => timed(phase, () => original(...args));
  };

  wrap(instance, 'register', 'boot.register');
  wrap(instance, 'bootstrap', 'boot.bootstrap');
  wrap(instance, 'destroy', 'destroy');
  wrap(instance.db, 'init', 'boot.bootstrap.db-init');
  wrap(instance.db.schema, 'sync', 'boot.bootstrap.schema-sync');

  const modules = instance.get('modules');
  wrap(modules, 'bootstrap', 'boot.bootstrap.modules');

  const originalRegister = modules.register.bind(modules);
  modules.register = async (...args) => {
    await originalRegister(...args);
    for (const [namespace, mod] of Object.entries(modules.getAll())) {
      wrap(mod, 'bootstrap', `boot.module.${namespace}`);
    }
  };
};

module.exports = { record, timed, instrumentInstance, enabled: Boolean(file) };
