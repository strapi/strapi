#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
const DOCKER_COMPOSE_FILE = path.join(MONOREPO_ROOT, 'docker-compose.dev.yml');

// v4 test project lives inside this example at `examples/complex/v4`
const V4_PROJECT_DIR = path.resolve(COMPLEX_DIR, 'v4');
const SQLITE_DB_FILE = path.join(COMPLEX_DIR, '.tmp', 'data.db');

function parseArgs() {
  const argv = process.argv.slice(2);
  const dbType = argv[0];

  // multiplier can appear as second arg; allow '--' separator commonly added by yarn
  let multiplier = '1';
  if (argv[1] && argv[1] !== '--') multiplier = argv[1];
  if (argv[1] === '--' && argv[2]) multiplier = argv[2];

  const extra = argv.slice(2);
  const hasLegacyFlag = argv.some((a) => a === '--legacy' || a === '--validator=legacy');

  return { dbType, multiplier, extra, hasLegacyFlag };
}

function ensureSqliteStaged(dbType) {
  if (dbType !== 'sqlite') return;

  const v4DbPath = path.join(V4_PROJECT_DIR, '.tmp', 'data.db');
  if (!fs.existsSync(v4DbPath)) {
    console.error(`⚠️  v4 sqlite DB not found at ${v4DbPath}`);
    console.error(
      'Run the v4 seeder first: (cd examples/complex/v4 && npm install && node scripts/seed-with-db.js sqlite)'
    );
    process.exit(1);
  }

  const v5TmpDir = path.dirname(SQLITE_DB_FILE);
  fs.mkdirSync(v5TmpDir, { recursive: true });
  try {
    // Ensure the tmp directory is writable by the current user
    fs.chmodSync(v5TmpDir, 0o700);
  } catch (e) {
    console.warn(`⚠️  Could not set permissions on directory ${v5TmpDir}: ${e.message}`);
  }

  // Backup existing v5 DB if present
  if (fs.existsSync(SQLITE_DB_FILE)) {
    const backup = path.join(v5TmpDir, 'older-db.db');
    try {
      fs.renameSync(SQLITE_DB_FILE, backup);
      console.log(`✅ Backed up existing v5 DB to ${backup}`);
    } catch (e) {
      console.warn(`⚠️  Failed to backup existing v5 DB: ${e.message}`);
    }
  }

  // Copy v4 DB into v5 location
  try {
    fs.copyFileSync(v4DbPath, SQLITE_DB_FILE);
    console.log(`✅ Copied v4 sqlite DB ${v4DbPath} -> ${SQLITE_DB_FILE}`);

    // Ensure the copied DB is writable by the current user/process. On some systems
    // the file may be read-only (copied from a read-only source) which causes
    // better-sqlite3 / knex to error with 'attempt to write a readonly database'.
    try {
      // Make sure the file is user-writable (rw-rw-r--)
      fs.chmodSync(SQLITE_DB_FILE, 0o664);
      console.log(`🔧 Set permissions 664 on ${SQLITE_DB_FILE}`);
    } catch (permErr) {
      console.warn(`⚠️  Could not set permissions on ${SQLITE_DB_FILE}: ${permErr.message}`);
    }
  } catch (e) {
    console.error(`❌ Failed to copy sqlite DB: ${e.message}`);
    process.exit(1);
  }
}

function ensureDbContainer(dbType) {
  if (dbType === 'postgres') {
    try {
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d postgres`, {
        cwd: MONOREPO_ROOT,
        stdio: 'inherit',
      });
      console.log('✅ postgres container ensured');
    } catch (e) {
      console.warn('⚠️  Failed to ensure postgres container:', e.message);
    }
  } else if (dbType === 'mariadb') {
    try {
      execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d mysql`, {
        cwd: MONOREPO_ROOT,
        stdio: 'inherit',
      });
      console.log('✅ mysql container ensured');
    } catch (e) {
      console.warn('⚠️  Failed to ensure mysql container:', e.message);
    }
  }
}

function getEnvForDb(dbType) {
  const env = { ...process.env };
  if (dbType === 'sqlite') {
    env.DATABASE_CLIENT = 'sqlite';
    env.DATABASE_FILENAME = SQLITE_DB_FILE;
  } else if (dbType === 'postgres') {
    env.DATABASE_CLIENT = 'postgres';
    env.DATABASE_HOST = 'localhost';
    env.DATABASE_PORT = '5432';
    env.DATABASE_NAME = 'strapi';
    env.DATABASE_USERNAME = 'strapi';
    env.DATABASE_PASSWORD = 'strapi';
    env.DATABASE_SSL = 'false';
  } else if (dbType === 'mariadb') {
    env.DATABASE_CLIENT = 'mysql';
    env.DATABASE_HOST = 'localhost';
    env.DATABASE_PORT = '3306';
    env.DATABASE_NAME = 'strapi';
    env.DATABASE_USERNAME = 'strapi';
    env.DATABASE_PASSWORD = 'strapi';
    env.DATABASE_SSL = 'false';
  }
  return env;
}

function runValidate(dbType, multiplier, extraArgs, hasLegacyFlag) {
  if (!dbType || !['postgres', 'mariadb', 'sqlite'].includes(dbType)) {
    console.error(
      'Usage: node scripts/validate-runner.js <postgres|mariadb|sqlite> [multiplier] [--legacy|--validator=legacy]'
    );
    process.exit(1);
  }

  if (dbType === 'sqlite') ensureSqliteStaged(dbType);
  else ensureDbContainer(dbType);

  const env = getEnvForDb(dbType);

  // Validator selection: default to docservice unless legacy requested
  const validatorEnv = (process.env.VALIDATOR || '').toLowerCase();
  let validateScript = 'scripts/validate-migration-docservice.js';
  if (hasLegacyFlag || validatorEnv === 'legacy') validateScript = 'scripts/validate-migration.js';
  if (validatorEnv === 'docservice') validateScript = 'scripts/validate-migration-docservice.js';

  console.log(
    `\n🔍 Running validator (${path.basename(validateScript)}) against ${dbType} (multiplier=${multiplier})\n`
  );

  const isWindows = process.platform === 'win32';
  const nodeBin = isWindows ? 'node.exe' : 'node';

  const child = spawn(nodeBin, [validateScript, multiplier, ...extraArgs], {
    cwd: COMPLEX_DIR,
    env,
    stdio: 'inherit',
    shell: !isWindows,
  });

  child.on('exit', (code) => process.exit(code || 0));
  child.on('error', (err) => {
    console.error('Failed to spawn validator:', err);
    process.exit(1);
  });
}

function main() {
  const { dbType, multiplier, extra, hasLegacyFlag } = parseArgs();
  runValidate(dbType, multiplier, extra, hasLegacyFlag);
}

if (require.main === module) main();

module.exports = { runValidate };
