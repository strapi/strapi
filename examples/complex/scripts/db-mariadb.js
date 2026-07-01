#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  getContainerName: getComposeContainerName,
  getComposeEnv,
  COMPOSE_PROJECT_NAME,
  assertSafeSnapshotName,
} = require('./db-utils');
const { runCompose, runContainer } = require('./compose');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');

const DB_NAME = process.env.DATABASE_NAME || 'strapi';
const DB_USER = process.env.DATABASE_USERNAME || 'strapi';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || 'strapi';

// All shell invocations go through runCompose / runContainer, which use
// child_process.execFileSync under the hood: arguments are passed as an array,
// no shell is spawned, and absolute paths from this module (DOCKER_COMPOSE_FILE,
// SNAPSHOTS_DIR, snapshotPath, restorePath) cannot break command parsing or
// be misinterpreted as multiple tokens. CodeQL flagged the previous pattern
// (template-string `execSync` with an interpolated path) as
// "Shell command built from environment values" — see PR #26060 review.

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

const dbCredArgs = [`-u${DB_USER}`, `-p${DB_PASSWORD}`];

function fail(message, error) {
  if (error && error.message) {
    console.error(`${message}: ${error.message}`);
  } else {
    console.error(message);
  }
  process.exit(1);
}

switch (command) {
  case 'start':
    console.log('Starting mariadb container...');
    try {
      runCompose(['-f', DOCKER_COMPOSE_FILE, 'up', '-d', 'mariadb'], {
        cwd: COMPLEX_DIR,
        stdio: 'inherit',
        env: getComposeEnv(),
      });
      console.log('✅ MariaDB started');
    } catch (error) {
      fail('Error starting MariaDB container', error);
    }
    break;

  case 'stop':
    console.log('Stopping mariadb container...');
    try {
      runCompose(['-f', DOCKER_COMPOSE_FILE, 'stop', 'mariadb'], {
        cwd: COMPLEX_DIR,
        stdio: 'inherit',
        env: getComposeEnv(),
      });
      console.log('✅ MariaDB stopped');
    } catch (error) {
      fail('Error stopping MariaDB container', error);
    }
    break;

  case 'snapshot': {
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-mariadb.js snapshot <name>');
      process.exit(1);
    }
    assertSafeSnapshotName(snapshotName);
    ensureSnapshotsDir();
    const snapshotPath = path.join(SNAPSHOTS_DIR, `mariadb-${snapshotName}.sql`);
    console.log(`Creating snapshot: ${snapshotName}...`);
    const containerName = getContainerName();
    try {
      // `mariadb-dump` is the modern binary; older images fall back to `mysqldump` alias.
      // Capture the dump's stdout in-process and write it to the snapshot file via fs,
      // instead of using a shell `>` redirection (which would require building a shell
      // command string from absolute paths).
      const dump = runContainer(
        ['exec', containerName, 'mariadb-dump', '-h', '127.0.0.1', ...dbCredArgs, DB_NAME],
        {
          cwd: COMPLEX_DIR,
          stdio: ['ignore', 'pipe', 'inherit'],
          encoding: 'buffer',
          maxBuffer: 1024 * 1024 * 1024,
        }
      );
      fs.writeFileSync(snapshotPath, dump);
      console.log(`✅ Snapshot created: ${snapshotPath}`);
    } catch (error) {
      fail('Error creating snapshot', error);
    }
    break;
  }

  case 'restore': {
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-mariadb.js restore <name>');
      process.exit(1);
    }
    assertSafeSnapshotName(snapshotName);
    const restorePath = path.join(SNAPSHOTS_DIR, `mariadb-${snapshotName}.sql`);
    if (!fs.existsSync(restorePath)) {
      console.error(`Error: Snapshot not found: ${restorePath}`);
      process.exit(1);
    }
    console.log(`Restoring snapshot: ${snapshotName}...`);
    const containerName = getContainerName();
    try {
      // Drop and recreate database
      runContainer(
        [
          'exec',
          containerName,
          'mariadb',
          '-h',
          '127.0.0.1',
          ...dbCredArgs,
          '-e',
          `DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};`,
        ],
        {
          cwd: COMPLEX_DIR,
          stdio: 'inherit',
        }
      );
      // Restore from snapshot — feed the SQL via stdin (`input`) so we don't need a
      // shell `<` redirection.
      const sql = fs.readFileSync(restorePath);
      runContainer(
        ['exec', '-i', containerName, 'mariadb', '-h', '127.0.0.1', ...dbCredArgs, DB_NAME],
        {
          cwd: COMPLEX_DIR,
          input: sql,
          stdio: ['pipe', 'inherit', 'inherit'],
          maxBuffer: 1024 * 1024 * 1024,
        }
      );
      console.log(`✅ Snapshot restored: ${snapshotName}`);
    } catch (error) {
      fail('Error restoring snapshot', error);
    }
    break;
  }

  case 'wipe': {
    console.log('Wiping mariadb database...');
    const containerName = getContainerName();
    try {
      runContainer(
        [
          'exec',
          containerName,
          'mariadb',
          '-h',
          '127.0.0.1',
          ...dbCredArgs,
          '-e',
          `DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};`,
        ],
        {
          cwd: COMPLEX_DIR,
          stdio: 'inherit',
        }
      );
      console.log('✅ Database wiped');
    } catch (error) {
      fail('Error wiping database', error);
    }
    break;
  }

  case 'check': {
    const containerName = getContainerName();
    try {
      // Refresh information_schema.tables.table_rows via ANALYZE TABLE;
      // without it, stats can lag reality by hours.
      const analyzeListQuery = `
        SELECT CONCAT('ANALYZE TABLE ', table_name, ';') AS cmd
        FROM information_schema.tables
        WHERE table_schema = '${DB_NAME}';
      `;
      try {
        const analyzeList = runContainer(
          [
            'exec',
            containerName,
            'mariadb',
            '-h',
            '127.0.0.1',
            ...dbCredArgs,
            '-D',
            DB_NAME,
            '-e',
            analyzeListQuery.trim(),
            '-s',
            '-N',
          ],
          {
            cwd: COMPLEX_DIR,
            encoding: 'utf8',
          }
        );
        const cmds = analyzeList.trim().split('\n').filter(Boolean).join(' ');
        if (cmds) {
          runContainer(
            [
              'exec',
              containerName,
              'mariadb',
              '-h',
              '127.0.0.1',
              ...dbCredArgs,
              '-D',
              DB_NAME,
              '-e',
              cmds,
            ],
            {
              cwd: COMPLEX_DIR,
              stdio: 'ignore',
            }
          );
        }
      } catch {
        // Best-effort; fall through to stale stats rather than fail.
      }

      const tableQuery = `
        SELECT
          table_name,
          table_rows
        FROM information_schema.tables
        WHERE table_schema = '${DB_NAME}'
        ORDER BY table_name;
      `;

      const output = runContainer(
        [
          'exec',
          containerName,
          'mariadb',
          '-h',
          '127.0.0.1',
          ...dbCredArgs,
          '-D',
          DB_NAME,
          '-e',
          tableQuery.trim(),
          '-s',
          '-N',
        ],
        {
          cwd: COMPLEX_DIR,
          encoding: 'utf8',
        }
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
      fail('Error checking database', error);
    }
    break;
  }

  default:
    console.error('Error: Unknown command');
    console.error('Usage: node db-mariadb.js <start|stop|snapshot|restore|wipe|check> [name]');
    process.exit(1);
}
