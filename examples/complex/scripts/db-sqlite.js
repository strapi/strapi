#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');
const DB_FILE = path.join(COMPLEX_DIR, '.tmp', 'data.db');

const command = process.argv[2];
const snapshotName = process.argv[3];

function ensureSnapshotsDir() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

function ensureTmpDir() {
  const tmpDir = path.dirname(DB_FILE);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

switch (command) {
  case 'start':
    console.log('SQLite database is file-based, no container to start.');
    console.log('Database file location:', DB_FILE);

    // If a v5 DB already exists, move it aside to `v5-db.db` (delete previous)
    try {
      const dir = path.dirname(DB_FILE);
      const v5Backup = path.join(dir, 'v5-db.db');

      if (fs.existsSync(DB_FILE)) {
        // Remove previous backup if present
        if (fs.existsSync(v5Backup)) {
          try {
            fs.unlinkSync(v5Backup);
            console.log(`Removed previous v5 backup: ${v5Backup}`);
          } catch (e) {
            console.warn(`Warning: failed to remove previous v5 backup: ${e.message}`);
          }
        }

        try {
          fs.renameSync(DB_FILE, v5Backup);
          console.log(`Renamed existing v5 DB to: ${v5Backup}`);
        } catch (e) {
          console.warn(`Warning: failed to rename existing v5 DB: ${e.message}`);
        }
      } else {
        console.log('No existing v5 DB to back up.');
      }
    } catch (e) {
      console.warn('Warning while rotating v5 DB:', e.message || e);
    }

    break;

  case 'stop':
    console.log('SQLite database is file-based, no container to stop.');
    break;

  case 'snapshot':
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-sqlite.js snapshot <name>');
      process.exit(1);
    }
    ensureSnapshotsDir();
    const snapshotPath = path.join(SNAPSHOTS_DIR, `sqlite-${snapshotName}.db`);

    if (!fs.existsSync(DB_FILE)) {
      console.error(`Error: Database file not found: ${DB_FILE}`);
      console.error('Make sure the database has been created first.');
      process.exit(1);
    }

    console.log(`Creating snapshot: ${snapshotName}...`);
    try {
      fs.copyFileSync(DB_FILE, snapshotPath);
      console.log(`✅ Snapshot created: ${snapshotPath}`);
    } catch (error) {
      console.error(`Error creating snapshot: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'restore':
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-sqlite.js restore <name>');
      process.exit(1);
    }
    const restorePath = path.join(SNAPSHOTS_DIR, `sqlite-${snapshotName}.db`);
    if (!fs.existsSync(restorePath)) {
      console.error(`Error: Snapshot not found: ${restorePath}`);
      process.exit(1);
    }
    console.log(`Restoring snapshot: ${snapshotName}...`);
    try {
      ensureTmpDir();
      // Remove existing database if it exists
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
      }
      fs.copyFileSync(restorePath, DB_FILE);
      console.log(`✅ Snapshot restored: ${snapshotName}`);
    } catch (error) {
      console.error(`Error restoring snapshot: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'wipe':
    console.log('Wiping sqlite databases (v4 and v5)...');
    let wipedCount = 0;

    // Wipe v5 database
    try {
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
        console.log(`✅ V5 database wiped: ${DB_FILE}`);
        wipedCount++;
      }
    } catch (error) {
      console.error(`Error wiping v5 database: ${error.message}`);
      process.exit(1);
    }

    // Wipe v4 database (if it exists)
    const V4_DB_FILE = path.resolve(COMPLEX_DIR, 'v4', '.tmp', 'data.db');
    try {
      if (fs.existsSync(V4_DB_FILE)) {
        fs.unlinkSync(V4_DB_FILE);
        console.log(`✅ V4 database wiped: ${V4_DB_FILE}`);
        wipedCount++;
      }
    } catch (error) {
      console.error(`Error wiping v4 database: ${error.message}`);
      process.exit(1);
    }

    if (wipedCount === 0) {
      console.log('No database files found to wipe.');
    } else {
      console.log(`✅ Wiped ${wipedCount} database file(s)`);
    }
    break;

  case 'check':
    try {
      if (!fs.existsSync(DB_FILE)) {
        console.log('📊 Database file does not exist (database is empty or wiped)');
        break;
      }

      // Use sqlite3 command-line tool to query the database
      const { execSync } = require('child_process');

      // Build a single query that gets all counts at once using UNION ALL
      // First get list of tables
      const tablesOutput = execSync(
        `sqlite3 ${DB_FILE} "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"`,
        { encoding: 'utf8' }
      );

      const tables = tablesOutput
        .trim()
        .split('\n')
        .filter((t) => t);

      if (tables.length === 0) {
        console.log('📊 No tables found (database is empty)');
      } else {
        // Build a single query with UNION ALL to get all counts at once
        const unionQueries = tables
          .map(
            (table, index) =>
              `SELECT '${table}' as table_name, (SELECT COUNT(*) FROM ${table}) as row_count`
          )
          .join(' UNION ALL ');

        const query = `SELECT table_name || '|' || row_count FROM (${unionQueries}) ORDER BY table_name;`;

        const output = execSync(`sqlite3 ${DB_FILE} "${query}"`, { encoding: 'utf8' });

        const lines = output
          .trim()
          .split('\n')
          .filter((l) => l.trim());

        console.log('📊 Database Tables:\n');
        console.log('Table Name                          | Row Count');
        console.log('------------------------------------|----------');

        for (const line of lines) {
          const [table, count] = line.split('|');
          const paddedName = (table || '').padEnd(35);
          console.log(`${paddedName} | ${count || '0'}`);
        }
      }
    } catch (error) {
      if (error.message.includes('sqlite3: command not found')) {
        console.error(
          'Error: sqlite3 command-line tool not found. Please install it to use the check command.'
        );
        console.error('On macOS: brew install sqlite');
        console.error('On Linux: sudo apt-get install sqlite3');
      } else {
        console.error(`Error checking database: ${error.message}`);
      }
      process.exit(1);
    }
    break;

  default:
    console.error('Error: Unknown command');
    console.error('Usage: node db-sqlite.js <start|stop|snapshot|restore|wipe|check> [name]');
    process.exit(1);
}
