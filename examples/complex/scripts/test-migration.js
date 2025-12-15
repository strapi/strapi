#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
// Use the v4 project located inside this example at `examples/complex/v4`
const V4_PROJECT_DIR = path.resolve(COMPLEX_DIR, 'v4');

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  const res = spawnSync(cmd, { stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
}

async function main() {
  console.log('== Migration test runner ==');

  // 1) Create/update v4 project
  run(`node ${path.join(COMPLEX_DIR, 'scripts', 'setup-v4-project.js')}`);

  // 2) Install deps in generated v4 project
  console.log('\n== Installing dependencies in v4 project ==');
  if (!fs.existsSync(V4_PROJECT_DIR)) {
    throw new Error(`v4 project not found at ${V4_PROJECT_DIR}`);
  }

  // Assume caller has already selected the correct Node version (see README).
  // Install dependencies for the isolated v4 project using npm to avoid
  // Yarn Berry workspace/locator issues when running inside a nested folder.
  run(`cd ${V4_PROJECT_DIR} && npm install --no-audit --no-fund`);

  // 3) Seed the v4 project (sqlite by default)
  console.log('\n== Seeding v4 project (sqlite) ==');

  // If an existing v4 sqlite DB exists, back it up to `.tmp/older-db.db`
  // so we always seed from a clean state. This preserves the previous DB
  // under the v4 project for inspection.
  const v4TmpDir = path.join(V4_PROJECT_DIR, '.tmp');
  const v4DbPath = path.join(v4TmpDir, 'data.db');
  const v4OldDbPath = path.join(v4TmpDir, 'older-db.db');

  try {
    if (fs.existsSync(v4DbPath)) {
      fs.mkdirSync(v4TmpDir, { recursive: true });
      // remove any existing older-db backup (overwrite)
      if (fs.existsSync(v4OldDbPath)) {
        try {
          fs.unlinkSync(v4OldDbPath);
        } catch (e) {}
      }
      fs.renameSync(v4DbPath, v4OldDbPath);
      console.log(`Backed up existing v4 DB to: ${v4OldDbPath}`);
    }
  } catch (err) {
    console.warn('Warning: failed to backup existing v4 DB:', err.message || err);
  }

  run(`cd ${V4_PROJECT_DIR} && node scripts/seed-with-db.js sqlite`);

  // 4) Copy v4 sqlite DB into the v5 project location so v5 will migrate it
  const v4Db = path.join(V4_PROJECT_DIR, '.tmp', 'data.db');
  const v5DbDir = path.join(COMPLEX_DIR, '.tmp');
  const v5Db = path.join(v5DbDir, 'data.db');
  console.log('\n== Copying v4 DB to v5 location ==');
  if (!fs.existsSync(v4Db)) {
    throw new Error(`v4 sqlite DB not found at ${v4Db}`);
  }
  fs.mkdirSync(v5DbDir, { recursive: true });

  // If a v5 DB already exists, back it up as `older-db.db` before overwriting.
  const v5OldDb = path.join(v5DbDir, 'older-db.db');
  try {
    if (fs.existsSync(v5Db)) {
      // remove previous backup if present
      if (fs.existsSync(v5OldDb)) {
        try {
          fs.unlinkSync(v5OldDb);
        } catch (e) {
          console.warn('Warning: failed to remove previous v5 backup:', e.message || e);
        }
      }
      fs.renameSync(v5Db, v5OldDb);
      console.log(`Backed up existing v5 DB to: ${v5OldDb}`);
    }
  } catch (err) {
    console.warn('Warning: failed to backup existing v5 DB:', err.message || err);
  }

  fs.copyFileSync(v4Db, v5Db);
  console.log(`Copied v4 DB (${v4Db}) -> v5 DB (${v5Db})`);

  // 5) Start v5 Strapi (develop) to run migrations against the copied DB
  console.log('\n== Starting v5 Strapi to run migrations (will stop after healthy) ==');
  const spawn = require('child_process').spawn;
  const serverCmd = `cd ${COMPLEX_DIR} && node scripts/develop-with-db.js sqlite`;
  const serverProc = spawn(serverCmd, { stdio: 'inherit', shell: true });

  // Wait for health endpoint
  const http = require('http');
  const start = Date.now();
  const timeoutMs = 60_000;
  const waitForHealthy = () =>
    new Promise((resolve, reject) => {
      const check = () => {
        const req = http.request(
          { hostname: '127.0.0.1', port: 1337, path: '/_health', method: 'GET', timeout: 2000 },
          (res) => {
            if (res.statusCode === 204) return resolve();
            retry();
          }
        );
        req.on('error', retry);
        req.on('timeout', () => {
          req.destroy();
          retry();
        });
        req.end();

        function retry() {
          if (Date.now() - start > timeoutMs)
            return reject(new Error('Timed out waiting for Strapi to become healthy'));
          setTimeout(check, 1000);
        }
      };
      check();
    });

  try {
    await waitForHealthy();
    console.log('Strapi v5 is healthy — migrations should be applied.');
  } catch (err) {
    serverProc.kill('SIGINT');
    throw err;
  }

  // Stop the server now that migrations ran
  console.log('\n== Stopping v5 Strapi (migrations applied) ==');
  serverProc.kill('SIGINT');

  // 6) Run the validate runner which stages the v4 sqlite DB (if needed) and runs validation
  console.log('\n== Validating migration (v5) using the copied sqlite DB ==');
  run(`node ${path.join(COMPLEX_DIR, 'scripts', 'validate-runner.js')} sqlite`);

  console.log('\n== Migration test completed successfully ==');
}

main().catch((err) => {
  console.error('\nMigration test failed:', err.message || err);
  process.exit(1);
});
