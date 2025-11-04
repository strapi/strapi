#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
const DOCKER_COMPOSE_FILE = path.join(MONOREPO_ROOT, 'docker-compose.dev.yml');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');

const DB_NAME = 'strapi';
const DB_USER = 'strapi';
const DB_PASSWORD = 'strapi';

// Try to find the container name dynamically, fallback to expected name
function getContainerName() {
  try {
    const output = execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} ps -q postgres`, {
      cwd: MONOREPO_ROOT,
      encoding: 'utf8',
    }).trim();
    if (output) {
      const containerId = output.split('\n')[0];
      const nameOutput = execSync(`docker inspect --format='{{.Name}}' ${containerId}`, {
        encoding: 'utf8',
      }).trim();
      return nameOutput.replace(/^\//, ''); // Remove leading slash
    }
  } catch (error) {
    // Fallback to expected name pattern
  }
  // Fallback: try to find by image name
  try {
    const output = execSync(`docker ps --filter "ancestor=postgres" --format "{{.Names}}"`, {
      encoding: 'utf8',
    }).trim();
    if (output) {
      return output.split('\n')[0];
    }
  } catch (error) {
    // Continue to default
  }
  return 'strapi-v5_postgres_1';
}

const command = process.argv[2];
const snapshotName = process.argv[3];

function ensureSnapshotsDir() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

function execDocker(command) {
  try {
    execSync(command, { stdio: 'inherit', cwd: MONOREPO_ROOT });
  } catch (error) {
    console.error(`Error executing: ${command}`);
    process.exit(1);
  }
}

function execDockerExec(command) {
  const containerName = getContainerName();
  try {
    execSync(`docker exec ${containerName} ${command}`, {
      stdio: 'inherit',
      cwd: MONOREPO_ROOT,
    });
  } catch (error) {
    console.error(`Error executing: ${command}`);
    process.exit(1);
  }
}

switch (command) {
  case 'start':
    console.log('Starting postgres container...');
    execDocker(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d postgres`);
    console.log('✅ Postgres started');
    break;

  case 'stop':
    console.log('Stopping postgres container...');
    execDocker(`docker-compose -f ${DOCKER_COMPOSE_FILE} stop postgres`);
    console.log('✅ Postgres stopped');
    break;

  case 'snapshot':
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-postgres.js snapshot <name>');
      process.exit(1);
    }
    ensureSnapshotsDir();
    const snapshotPath = path.join(SNAPSHOTS_DIR, `postgres-${snapshotName}.sql`);
    console.log(`Creating snapshot: ${snapshotName}...`);
    const containerName = getContainerName();
    try {
      execSync(
        `docker exec ${containerName} pg_dump -U ${DB_USER} -d ${DB_NAME} > ${snapshotPath}`,
        { stdio: 'inherit', cwd: MONOREPO_ROOT }
      );
      console.log(`✅ Snapshot created: ${snapshotPath}`);
    } catch (error) {
      console.error(`Error creating snapshot: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'restore':
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-postgres.js restore <name>');
      process.exit(1);
    }
    const restorePath = path.join(SNAPSHOTS_DIR, `postgres-${snapshotName}.sql`);
    if (!fs.existsSync(restorePath)) {
      console.error(`Error: Snapshot not found: ${restorePath}`);
      process.exit(1);
    }
    console.log(`Restoring snapshot: ${snapshotName}...`);
    const containerName = getContainerName();
    try {
      // Drop and recreate database
      execSync(
        `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`,
        { stdio: 'inherit', cwd: MONOREPO_ROOT }
      );
      execSync(
        `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`,
        { stdio: 'inherit', cwd: MONOREPO_ROOT }
      );
      // Restore from snapshot
      execSync(
        `docker exec -i ${containerName} psql -U ${DB_USER} -d ${DB_NAME} < ${restorePath}`,
        { stdio: 'inherit', cwd: MONOREPO_ROOT }
      );
      console.log(`✅ Snapshot restored: ${snapshotName}`);
    } catch (error) {
      console.error(`Error restoring snapshot: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'wipe':
    console.log('Wiping postgres database...');
    const containerName = getContainerName();
    try {
      execSync(
        `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`,
        { stdio: 'inherit', cwd: MONOREPO_ROOT }
      );
      execSync(
        `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`,
        { stdio: 'inherit', cwd: MONOREPO_ROOT }
      );
      console.log('✅ Database wiped');
    } catch (error) {
      console.error(`Error wiping database: ${error.message}`);
      process.exit(1);
    }
    break;

  default:
    console.error('Error: Unknown command');
    console.error('Usage: node db-postgres.js <start|stop|snapshot|restore|wipe> [name]');
    process.exit(1);
}
