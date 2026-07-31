#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DOCKER_COMPOSE_FILE = '__DOCKER_COMPOSE_FILE__';
const {
  getContainerId,
  isContainerRunning,
  startContainer,
  assertPostgresReady,
  assertMysqlReady,
  assertMariadbReady,
  getDatabaseEnv,
} = require('./db-utils');

const dbType = process.argv[2];

if (!dbType || !['postgres', 'mysql', 'mariadb', 'sqlite'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node scripts/develop-with-db.js <postgres|mysql|mariadb|sqlite>');
  process.exit(1);
}

const readinessCheckers = {
  postgres: assertPostgresReady,
  mysql: assertMysqlReady,
  mariadb: assertMariadbReady,
};

function ensureContainerRunning(serviceName) {
  if (dbType === 'sqlite') return;

  const assertReady = readinessCheckers[dbType];
  const containerId = getContainerId(DOCKER_COMPOSE_FILE, PROJECT_DIR, serviceName);
  if (containerId && isContainerRunning(containerId)) {
    console.log(`✅ ${serviceName} container is already running`);
    assertReady(containerId);
    return;
  }

  console.log(`Starting ${serviceName} container...`);
  try {
    startContainer(DOCKER_COMPOSE_FILE, PROJECT_DIR, serviceName);
    console.log(`✅ ${serviceName} container started`);
    const newContainerId = getContainerId(DOCKER_COMPOSE_FILE, PROJECT_DIR, serviceName);
    assertReady(newContainerId);
  } catch (error) {
    console.error(`Error starting ${serviceName} container: ${error.message}`);
    process.exit(1);
  }
}

function startStrapi() {
  if (['postgres', 'mysql', 'mariadb'].includes(dbType)) {
    ensureContainerRunning(dbType);
  }

  const env = getDatabaseEnv(dbType);

  console.log(`\n🚀 Starting Strapi with ${dbType} database...\n`);

  const isWindows = process.platform === 'win32';
  const strapiProcess = spawn(isWindows ? 'yarn.cmd' : 'yarn', ['develop'], {
    cwd: PROJECT_DIR,
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
