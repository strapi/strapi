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
  getDatabaseEnv,
} = require('./db-utils');

const dbType = process.argv[2];
let multiplierArgIndex = 3;
if (process.argv[multiplierArgIndex] === '--') {
  multiplierArgIndex = 4;
}
const multiplier = process.argv[multiplierArgIndex] || '1';

if (!dbType || !['postgres', 'mysql'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node scripts/seed-with-db.js <postgres|mysql> [multiplier]');
  process.exit(1);
}

function ensureContainerRunning(serviceName) {
  const containerId = getContainerId(DOCKER_COMPOSE_FILE, PROJECT_DIR, serviceName);
  if (containerId && isContainerRunning(containerId)) {
    console.log(`✅ ${serviceName} container is already running`);
    if (dbType === 'postgres') assertPostgresReady(containerId);
    if (dbType === 'mysql') assertMysqlReady(containerId);
    return;
  }

  console.log(`Starting ${serviceName} container...`);
  try {
    startContainer(DOCKER_COMPOSE_FILE, PROJECT_DIR, serviceName);
    console.log(`✅ ${serviceName} container started`);
    const newContainerId = getContainerId(DOCKER_COMPOSE_FILE, PROJECT_DIR, serviceName);
    if (dbType === 'postgres') assertPostgresReady(newContainerId);
    if (dbType === 'mysql') assertMysqlReady(newContainerId);
  } catch (error) {
    console.error(`Error starting ${serviceName} container: ${error.message}`);
    process.exit(1);
  }
}

function runSeed() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mysql') {
    ensureContainerRunning('mysql');
  }

  const env = getDatabaseEnv(dbType);

  console.log(`\n🌱 Seeding database (${dbType}) with multiplier: ${multiplier}...\n`);

  const isWindows = process.platform === 'win32';
  const seedProcess = spawn(isWindows ? 'node.exe' : 'node', ['scripts/seed.js', multiplier], {
    cwd: PROJECT_DIR,
    env,
    stdio: 'inherit',
    shell: !isWindows,
  });

  seedProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  seedProcess.on('error', (error) => {
    console.error('Error running seed script:', error);
    process.exit(1);
  });
}

runSeed();
