#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  getContainerName: getComposeContainerName,
  getComposeEnv,
  COMPOSE_PROJECT_NAME,
} = require('./db-utils');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');

const DB_NAME = process.env.DATABASE_NAME || 'strapi';
const DB_USER = process.env.DATABASE_USERNAME || 'strapi';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || 'strapi';

// Try to find the container name dynamically, fallback to expected name
function getContainerName() {
  const name = getComposeContainerName(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'mysql');
  if (!name) {
    throw new Error(
      `MySQL container not found. Start it with "yarn db:start:mysql" (COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}).`
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
    console.log('Starting mysql container...');
    execDocker(`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d mysql`);
    console.log('✅ MySQL started');
    break;

  case 'stop':
    console.log('Stopping mysql container...');
    execDocker(`docker-compose -f ${DOCKER_COMPOSE_FILE} stop mysql`);
    console.log('✅ MySQL stopped');
    break;

  case 'snapshot':
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-mysql.js snapshot <name>');
      process.exit(1);
    }
    ensureSnapshotsDir();
    const snapshotPath = path.join(SNAPSHOTS_DIR, `mysql-${snapshotName}.sql`);
    console.log(`Creating snapshot: ${snapshotName}...`);
    {
      const containerName = getContainerName();
      try {
        execSync(
          `docker exec ${containerName} mysqldump -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${snapshotPath}`,
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
      console.error('Usage: node db-mysql.js restore <name>');
      process.exit(1);
    }
    const restorePath = path.join(SNAPSHOTS_DIR, `mysql-${snapshotName}.sql`);
    if (!fs.existsSync(restorePath)) {
      console.error(`Error: Snapshot not found: ${restorePath}`);
      process.exit(1);
    }
    console.log(`Restoring snapshot: ${snapshotName}...`);
    {
      const containerName = getContainerName();
      try {
        // Drop and recreate database
        execSync(
          `docker exec ${containerName} mysql -u${DB_USER} -p${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR }
        );
        // Restore from snapshot
        execSync(
          `docker exec -i ${containerName} mysql -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < ${restorePath}`,
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
    console.log('Wiping mysql database...');
    {
      const containerName = getContainerName();
      try {
        execSync(
          `docker exec ${containerName} mysql -u${DB_USER} -p${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};"`,
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
        // Use information_schema for fast approximate counts
        const query = `
          SELECT 
            table_name,
            table_rows
          FROM information_schema.tables
          WHERE table_schema = '${DB_NAME}'
          ORDER BY table_name;
        `;

        const output = execSync(
          `docker exec ${containerName} mysql -u${DB_USER} -p${DB_PASSWORD} -D ${DB_NAME} -e "${query.trim()}" -s -N`,
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
            const [table, count] = line.trim().split('\t');
            const paddedName = (table || '').padEnd(35);
            const rowCount = count || '0';
            console.log(`${paddedName} | ${rowCount}`);
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
    console.error('Usage: node db-mysql.js <start|stop|snapshot|restore|wipe|check> [name]');
    process.exit(1);
}
