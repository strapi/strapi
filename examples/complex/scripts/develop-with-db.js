#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const UPLOADS_DIR = path.join(COMPLEX_DIR, 'public', 'uploads');
const COMPOSE_PROJECT_NAME = 'strapi_complex';

function getComposeEnv() {
  return { ...process.env, COMPOSE_PROJECT_NAME };
}

const dbType = process.argv[2];

if (!dbType || !['postgres', 'mysql'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node develop-with-db.js <postgres|mysql>');
  process.exit(1);
}

// Check if container is running
function isContainerRunning(serviceName) {
  try {
    const output = execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} ps -q ${serviceName}`, {
      cwd: COMPLEX_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
      env: getComposeEnv(),
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

function getContainerId(serviceName) {
  try {
    const output = execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} ps -q ${serviceName}`, {
      cwd: COMPLEX_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
      env: getComposeEnv(),
    }).trim();
    if (!output) return null;
    return output.split('\n')[0];
  } catch (error) {
    return null;
  }
}

function waitForPostgresReady() {
  const containerId = getContainerId('postgres');
  if (!containerId) return;

  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      execSync(`docker exec ${containerId} pg_isready -U strapi`, {
        stdio: 'ignore',
      });
      return;
    } catch (error) {
      // Wait and retry.
    }
  }
  console.warn('⚠️  Postgres did not report ready within 30s; continuing anyway.');
}

function waitForMysqlReady() {
  const containerId = getContainerId('mysql');
  if (!containerId) return;

  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      execSync(`docker exec ${containerId} mysqladmin ping -u strapi -pstrapi --silent`, {
        stdio: 'ignore',
      });
      return;
    } catch (error) {
      // Wait and retry.
    }
  }
  console.warn('⚠️  MySQL did not report ready within 30s; continuing anyway.');
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Start container if not running
function ensureContainerRunning(serviceName) {
  if (isContainerRunning(serviceName)) {
    console.log(`✅ ${serviceName} container is already running`);
    if (dbType === 'postgres') {
      console.log('Waiting for database to be ready...');
      waitForPostgresReady();
    }
    if (dbType === 'mysql') {
      console.log('Waiting for database to be ready...');
      waitForMysqlReady();
    }
    return;
  }

  console.log(`Starting ${serviceName} container...`);
  try {
    execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d ${serviceName}`, {
      cwd: COMPLEX_DIR,
      stdio: 'inherit',
      env: getComposeEnv(),
    });
    console.log(`✅ ${serviceName} container started`);

    // Wait a bit for the database to be ready
    if (dbType === 'postgres') {
      console.log('Waiting for database to be ready...');
      waitForPostgresReady();
    }
    if (dbType === 'mysql') {
      console.log('Waiting for database to be ready...');
      waitForMysqlReady();
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

    case 'mysql':
      env.DATABASE_CLIENT = 'mysql';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '3306';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;
  }

  return env;
}

// Start Strapi develop
function startStrapi() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mysql') {
    ensureContainerRunning('mysql');
  }

  const env = getEnvVars();

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
