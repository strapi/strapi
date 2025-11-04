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
    console.log('Wiping sqlite database...');
    try {
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
        console.log('✅ Database wiped');
      } else {
        console.log('Database file does not exist, nothing to wipe.');
      }
    } catch (error) {
      console.error(`Error wiping database: ${error.message}`);
      process.exit(1);
    }
    break;

  default:
    console.error('Error: Unknown command');
    console.error('Usage: node db-sqlite.js <start|stop|snapshot|restore|wipe> [name]');
    process.exit(1);
}
