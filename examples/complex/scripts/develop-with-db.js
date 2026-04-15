#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const {
  getContainerId,
  isContainerRunning,
  startContainer,
  waitForPostgresReady,
  waitForMysqlReady,
  waitForMariadbReady,
  getDatabaseEnv,
} = require('./db-utils');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const UPLOADS_DIR = path.join(COMPLEX_DIR, 'public', 'uploads');

const dbType = process.argv[2];

if (!dbType || !['postgres', 'mysql', 'mariadb', 'sqlite'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node develop-with-db.js <postgres|mysql|mariadb|sqlite>');
  process.exit(1);
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Per-dialect readiness check map
const readinessCheckers = {
  postgres: waitForPostgresReady,
  mysql: waitForMysqlReady,
  mariadb: waitForMariadbReady,
};

// Start container if not running (no-op for sqlite)
function ensureContainerRunning(serviceName) {
  if (dbType === 'sqlite') return;

  const containerId = getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName);
  const waitForReady = readinessCheckers[dbType];

  if (containerId && isContainerRunning(containerId)) {
    console.log(`✅ ${serviceName} container is already running`);
    console.log('Waiting for database to be ready...');
    waitForReady(containerId);
    return;
  }

  console.log(`Starting ${serviceName} container...`);
  try {
    startContainer(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName);
    console.log(`✅ ${serviceName} container started`);
    console.log('Waiting for database to be ready...');
    waitForReady(getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName));
  } catch (error) {
    console.error(`Error starting ${serviceName} container:`, error.message);
    process.exit(1);
  }
}

// Start Strapi develop
function startStrapi() {
  // For containerized dialects the service name equals the dbType.
  if (['postgres', 'mysql', 'mariadb'].includes(dbType)) {
    ensureContainerRunning(dbType);
  }

  const env = getDatabaseEnv(dbType);

  ensureUploadsDir();
  console.log(`\n🚀 Starting Strapi with ${dbType} database...\n`);

  const isWindows = process.platform === 'win32';
  const strapiProcess = spawn(isWindows ? 'yarn.cmd' : 'yarn', ['develop'], {
    cwd: COMPLEX_DIR,
    env,
    stdio: 'inherit',
    shell: !isWindows,
  });

  let isShuttingDown = false;

  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n\n⏹️  Stopping Strapi server (database container, if any, keeps running)...');
    strapiProcess.kill('SIGINT');

    strapiProcess.on('exit', () => {
      process.exit(0);
    });

    setTimeout(() => {
      if (!strapiProcess.killed) {
        strapiProcess.kill('SIGKILL');
        process.exit(0);
      }
    }, 5000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  strapiProcess.on('exit', (code) => {
    if (!isShuttingDown) {
      process.exit(code || 0);
    }
  });

  strapiProcess.on('error', (error) => {
    console.error('Error starting Strapi:', error);
    process.exit(1);
  });
}

startStrapi();
