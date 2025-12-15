#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
const DOCKER_COMPOSE_FILE = path.join(MONOREPO_ROOT, 'docker-compose.dev.yml');

const dbType = process.argv[2];

if (!dbType || !['postgres', 'mariadb', 'sqlite'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node develop-with-db.js <postgres|mariadb|sqlite>');
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
      // Use a simple blocking wait (cross-platform)
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
      break;
  }

  return env;
}

// Start Strapi develop
function startStrapi() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mariadb') {
    ensureContainerRunning('mysql');
  }

  const env = getEnvVars();

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
