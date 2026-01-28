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
  getDatabaseEnv,
} = require('./db-utils');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const UPLOADS_DIR = path.join(COMPLEX_DIR, 'public', 'uploads');

const dbType = process.argv[2];

if (!dbType || !['postgres', 'mysql'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node develop-with-db.js <postgres|mysql>');
  process.exit(1);
}

// db-utils provides container lookup/readiness helpers

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Start container if not running
function ensureContainerRunning(serviceName) {
  const containerId = getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName);
  if (containerId && isContainerRunning(containerId)) {
    console.log(`✅ ${serviceName} container is already running`);
    if (dbType === 'postgres') {
      console.log('Waiting for database to be ready...');
      waitForPostgresReady(containerId);
    }
    if (dbType === 'mysql') {
      console.log('Waiting for database to be ready...');
      waitForMysqlReady(containerId);
    }
    return;
  }

  console.log(`Starting ${serviceName} container...`);
  try {
    startContainer(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName);
    console.log(`✅ ${serviceName} container started`);

    // Wait a bit for the database to be ready
    if (dbType === 'postgres') {
      console.log('Waiting for database to be ready...');
      waitForPostgresReady(getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName));
    }
    if (dbType === 'mysql') {
      console.log('Waiting for database to be ready...');
      waitForMysqlReady(getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, serviceName));
    }
  } catch (error) {
    console.error(`Error starting ${serviceName} container:`, error.message);
    process.exit(1);
  }
}

// Start Strapi develop
function startStrapi() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mysql') {
    ensureContainerRunning('mysql');
  }

  const env = getDatabaseEnv(dbType);

  ensureUploadsDir();
  console.log(`\n🚀 Starting Strapi with ${dbType} database...\n`);

  // Spawn strapi develop process
  // Use cross-platform approach
  const isWindows = process.platform === 'win32';
  const strapiProcess = spawn(isWindows ? 'yarn.cmd' : 'yarn', ['develop'], {
    cwd: COMPLEX_DIR,
    env,
    stdio: 'inherit',
    shell: !isWindows,
  });

  // Handle process termination
  let isShuttingDown = false;

  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n\n⏹️  Stopping Strapi server (database container will keep running)...');
    strapiProcess.kill('SIGINT');

    // Wait for process to exit
    strapiProcess.on('exit', () => {
      process.exit(0);
    });

    // Force exit after 5 seconds if process doesn't exit
    setTimeout(() => {
      if (!strapiProcess.killed) {
        strapiProcess.kill('SIGKILL');
        process.exit(0);
      }
    }, 5000);
  };

  // Handle Ctrl+C
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle strapi process exit
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
