#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
const DOCKER_COMPOSE_FILE = path.join(MONOREPO_ROOT, 'docker-compose.dev.yml');

const V4_PROJECT_DIR = path.resolve(MONOREPO_ROOT, '..', 'complex-v4');
const SQLITE_DB_FILE = path.join(COMPLEX_DIR, '.tmp', 'data.db');

const dbType = process.argv[2];
// Skip '--' if present (yarn passes it as an argument separator)
let multiplierArgIndex = 3;
if (process.argv[multiplierArgIndex] === '--') {
  multiplierArgIndex = 4;
}
const multiplier = process.argv[multiplierArgIndex] || '1';

if (!dbType || !['postgres', 'mariadb', 'sqlite'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error(
    'Usage: node scripts/validate-migration-with-db.js <postgres|mariadb|sqlite> [multiplier]'
  );
  process.exit(1);
}

// Check if container is running
function isContainerRunning(serviceName) {
  try {
    const output = execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} ps -q ${serviceName}`, {
      cwd: MONOREPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    if (!output) return false;

    // Check if container is actually running
    const status = execSync(
      `docker inspect --format='{{.State.Running}}' ${output.split('\n')[0]}`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    return status === 'true';
  } catch (error) {
    return false;
  }
}

// Start container if not running
function ensureContainerRunning(serviceName) {
  if (isContainerRunning(serviceName)) {
    console.log(`✅ ${serviceName} container is already running`);
    return;
  }

  console.log(`Starting ${serviceName} container...`);
  try {
    execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d ${serviceName}`, {
      cwd: MONOREPO_ROOT,
      stdio: 'inherit',
    });
    console.log(`✅ ${serviceName} container started`);

    // Wait a bit for the database to be ready
    if (dbType === 'postgres' || dbType === 'mariadb') {
      console.log('Waiting for database to be ready...');
      const start = Date.now();
      while (Date.now() - start < 3000) {
        // Blocking wait
      }
    }
  } catch (error) {
    console.error(`Error starting ${serviceName} container:`, error.message);
    process.exit(1);
  }
}

function copyV4DatabaseToV5() {
  if (dbType !== 'sqlite') {
    return;
  }

  const v4DbPath = path.join(V4_PROJECT_DIR, '.tmp', 'data.db');
  if (!fs.existsSync(v4DbPath)) {
    console.warn(`⚠️  v4 sqlite database not found at ${v4DbPath}`);
    console.warn('Make sure you have run: (cd ../../../complex-v4 && yarn seed:sqlite)');
    process.exit(1);
  }

  const v4DbSize = fs.statSync(v4DbPath).size;
  if (v4DbSize === 0) {
    console.error(`⚠️  v4 sqlite database is empty at ${v4DbPath}`);
    process.exit(1);
  }

  // Copy v4 database to v5 location (overwrite if exists)
  try {
    fs.mkdirSync(path.dirname(SQLITE_DB_FILE), { recursive: true });
    // Remove v5 database if it exists to ensure clean copy
    if (fs.existsSync(SQLITE_DB_FILE)) {
      fs.unlinkSync(SQLITE_DB_FILE);
    }
    fs.copyFileSync(v4DbPath, SQLITE_DB_FILE);

    // Verify the copy was successful
    if (!fs.existsSync(SQLITE_DB_FILE)) {
      console.error(`❌ Failed to copy database: target file does not exist at ${SQLITE_DB_FILE}`);
      process.exit(1);
    }

    const copiedDbSize = fs.statSync(SQLITE_DB_FILE).size;
    if (copiedDbSize !== v4DbSize) {
      console.error(
        `❌ Database copy size mismatch: source ${v4DbSize} bytes, target ${copiedDbSize} bytes`
      );
      process.exit(1);
    }

    console.log(`✅ Copied v4 sqlite database to ${SQLITE_DB_FILE} (${copiedDbSize} bytes)`);
    console.log(`   Database will be used at: ${SQLITE_DB_FILE}`);
  } catch (error) {
    console.error('Failed to copy sqlite database:', error.message);
    process.exit(1);
  }
}

// Set up environment variables based on database type
function getEnvVars() {
  const env = { ...process.env };

  switch (dbType) {
    case 'postgres':
      env.DATABASE_CLIENT = 'postgres';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '5432';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;

    case 'mariadb':
      env.DATABASE_CLIENT = 'mysql';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '3306';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;

    case 'sqlite':
      env.DATABASE_CLIENT = 'sqlite';
      env.DATABASE_FILENAME = SQLITE_DB_FILE;
      break;
  }

  return env;
}

// Run validate script
function runValidate() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mariadb') {
    ensureContainerRunning('mysql');
  } else if (dbType === 'sqlite') {
    copyV4DatabaseToV5();
  }

  const env = getEnvVars();

  console.log(`\n🔍 Validating migration (${dbType}) with multiplier: ${multiplier}...\n`);

  // Spawn validate script process
  const isWindows = process.platform === 'win32';
  const validateProcess = spawn(
    isWindows ? 'node.exe' : 'node',
    ['scripts/validate-migration.js', multiplier],
    {
      cwd: COMPLEX_DIR,
      env,
      stdio: 'inherit',
      shell: !isWindows,
    }
  );

  validateProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  validateProcess.on('error', (error) => {
    console.error('Error running validate script:', error);
    process.exit(1);
  });
}

runValidate();
