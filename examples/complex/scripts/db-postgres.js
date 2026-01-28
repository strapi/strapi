#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  getContainerName: getComposeContainerName,
  getComposeEnv,
  startContainer,
  COMPOSE_PROJECT_NAME,
} = require('./db-utils');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');

const DB_NAME = process.env.DATABASE_NAME || 'strapi';
const DB_USER = process.env.DATABASE_USERNAME || 'strapi';

// Try to find the container name dynamically, fallback to expected name
function resolveContainerName() {
  const name = getComposeContainerName(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'postgres');
  if (!name) {
    throw new Error(
      `Postgres container not found. Start it with "yarn db:start:postgres" (COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}).`
    );
  }
  return name;
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
    execSync(command, { stdio: 'inherit', cwd: COMPLEX_DIR, env: getComposeEnv() });
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
    {
      const containerName = resolveContainerName();
      try {
        execSync(
          `docker exec ${containerName} pg_dump -U ${DB_USER} -d ${DB_NAME} > ${snapshotPath}`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        console.log(`✅ Snapshot created: ${snapshotPath}`);
      } catch (error) {
        console.error(`Error creating snapshot: ${error.message}`);
        process.exit(1);
      }
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
    {
      const containerName = resolveContainerName();
      try {
        // Drop and recreate database
        execSync(
          `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        execSync(
          `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        // Restore from snapshot
        execSync(
          `docker exec -i ${containerName} psql -U ${DB_USER} -d ${DB_NAME} < ${restorePath}`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        console.log(`✅ Snapshot restored: ${snapshotName}`);
      } catch (error) {
        console.error(`Error restoring snapshot: ${error.message}`);
        process.exit(1);
      }
    }
    break;

  case 'wipe':
    // Ensure container is running first
    console.log('Ensuring postgres container is running...');
    try {
      startContainer(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'postgres');
      // Wait a moment for container to be ready
      execSync('sleep 2', { stdio: 'inherit' });
    } catch (error) {
      console.error(`Error starting postgres container: ${error.message}`);
      process.exit(1);
    }

    console.log('Wiping postgres database...');
    {
      const containerName = resolveContainerName();
      try {
        execSync(
          `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        execSync(
          `docker exec ${containerName} psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        console.log('✅ Database wiped');
      } catch (error) {
        console.error(`Error wiping database: ${error.message}`);
        process.exit(1);
      }
    }
    break;

  case 'check':
    {
      const containerName = getContainerName();
      try {
        // Use pg_stat_user_tables statistics for fast approximate counts
        const query = `
          SELECT 
            schemaname||'.'||relname as table_name,
            COALESCE(n_live_tup, 0)::text as row_count
          FROM pg_stat_user_tables
          ORDER BY schemaname, relname;
        `;

        const output = execSync(
          `docker exec ${containerName} psql -U ${DB_USER} -d ${DB_NAME} -t -c "${query.trim()}"`,
          { encoding: 'utf8', cwd: COMPLEX_DIR }
        );

        const lines = output
          .trim()
          .split('\n')
          .filter((l) => l.trim());

        if (lines.length === 0) {
          console.log('📊 No tables found (database is empty or wiped)');
        } else {
          console.log('📊 Database Tables (approximate row counts):\n');
          console.log('Table Name                          | Row Count');
          console.log('------------------------------------|----------');

          for (const line of lines) {
            const [table, count] = line
              .trim()
              .split('|')
              .map((s) => s.trim());
            const tableName = table.replace(/^public\./, ''); // Remove schema prefix
            const paddedName = tableName.padEnd(35);
            console.log(`${paddedName} | ${count}`);
          }
        }
      } catch (error) {
        console.error(`Error checking database: ${error.message}`);
        process.exit(1);
      }
    }
    break;

  default:
    console.error('Error: Unknown command');
    console.error('Usage: node db-postgres.js <start|stop|snapshot|restore|wipe|check> [name]');
    process.exit(1);
}
