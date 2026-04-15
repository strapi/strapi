#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  getContainerName: getComposeContainerName,
  getComposeEnv,
  COMPOSE_PROJECT_NAME,
} = require('./db-utils');
const { getComposeCommand, getContainerCommand } = require('./compose');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');

const DB_NAME = process.env.DATABASE_NAME || 'strapi';
const DB_USER = process.env.DATABASE_USERNAME || 'strapi';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || 'strapi';

function composeCmd() {
  const { exe, prefixArgs } = getComposeCommand();
  return [exe, ...prefixArgs].join(' ');
}

function containerCmd() {
  return getContainerCommand();
}

function getContainerName() {
  const name = getComposeContainerName(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'mariadb');
  if (!name) {
    throw new Error(
      `MariaDB container not found. Start it with "yarn db:start:mariadb" (COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}).`
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

function execShell(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: COMPLEX_DIR, env: getComposeEnv(), shell: '/bin/bash' });
  } catch (error) {
    console.error(`Error executing: ${cmd}`);
    process.exit(1);
  }
}

switch (command) {
  case 'start':
    console.log('Starting mariadb container...');
    execShell(`${composeCmd()} -f ${DOCKER_COMPOSE_FILE} up -d mariadb`);
    console.log('✅ MariaDB started');
    break;

  case 'stop':
    console.log('Stopping mariadb container...');
    execShell(`${composeCmd()} -f ${DOCKER_COMPOSE_FILE} stop mariadb`);
    console.log('✅ MariaDB stopped');
    break;

  case 'snapshot':
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-mariadb.js snapshot <name>');
      process.exit(1);
    }
    ensureSnapshotsDir();
    const snapshotPath = path.join(SNAPSHOTS_DIR, `mariadb-${snapshotName}.sql`);
    console.log(`Creating snapshot: ${snapshotName}...`);
    {
      const containerName = getContainerName();
      try {
        // `mariadb-dump` is the modern binary; older images fall back to `mysqldump` alias.
        execSync(
          `${containerCmd()} exec ${containerName} mariadb-dump -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${snapshotPath}`,
          { stdio: 'inherit', cwd: COMPLEX_DIR, shell: '/bin/bash' }
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
      console.error('Usage: node db-mariadb.js restore <name>');
      process.exit(1);
    }
    const restorePath = path.join(SNAPSHOTS_DIR, `mariadb-${snapshotName}.sql`);
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
          `${containerCmd()} exec ${containerName} mariadb -u${DB_USER} -p${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR, shell: '/bin/bash' }
        );
        // Restore from snapshot
        execSync(
          `${containerCmd()} exec -i ${containerName} mariadb -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < ${restorePath}`,
          { stdio: 'inherit', cwd: COMPLEX_DIR, shell: '/bin/bash' }
        );
        console.log(`✅ Snapshot restored: ${snapshotName}`);
      } catch (error) {
        console.error(`Error restoring snapshot: ${error.message}`);
        process.exit(1);
      }
    }
    break;

  case 'wipe':
    console.log('Wiping mariadb database...');
    {
      const containerName = getContainerName();
      try {
        execSync(
          `${containerCmd()} exec ${containerName} mariadb -u${DB_USER} -p${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};"`,
          { stdio: 'inherit', cwd: COMPLEX_DIR, shell: '/bin/bash' }
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
        // Refresh information_schema.tables.table_rows via ANALYZE TABLE;
        // without it, stats can lag reality by hours.
        const analyzeQuery = `
          SELECT CONCAT('ANALYZE TABLE ', table_name, ';') AS cmd
          FROM information_schema.tables
          WHERE table_schema = '${DB_NAME}';
        `;
        try {
          const analyzeList = execSync(
            `${containerCmd()} exec ${containerName} mariadb -u${DB_USER} -p${DB_PASSWORD} -D ${DB_NAME} -e "${analyzeQuery.trim()}" -s -N`,
            { encoding: 'utf8', cwd: COMPLEX_DIR, shell: '/bin/bash' }
          );
          const cmds = analyzeList.trim().split('\n').filter(Boolean).join(' ');
          if (cmds) {
            execSync(
              `${containerCmd()} exec ${containerName} mariadb -u${DB_USER} -p${DB_PASSWORD} -D ${DB_NAME} -e "${cmds}"`,
              { stdio: 'ignore', cwd: COMPLEX_DIR, shell: '/bin/bash' }
            );
          }
        } catch {
          // Best-effort; fall through to stale stats rather than fail.
        }

        const query = `
          SELECT
            table_name,
            table_rows
          FROM information_schema.tables
          WHERE table_schema = '${DB_NAME}'
          ORDER BY table_name;
        `;

        const output = execSync(
          `${containerCmd()} exec ${containerName} mariadb -u${DB_USER} -p${DB_PASSWORD} -D ${DB_NAME} -e "${query.trim()}" -s -N`,
          { encoding: 'utf8', cwd: COMPLEX_DIR, shell: '/bin/bash' }
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
    console.error('Usage: node db-mariadb.js <start|stop|snapshot|restore|wipe|check> [name]');
    process.exit(1);
}
