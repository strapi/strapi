#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const SNAPSHOTS_DIR = path.join(COMPLEX_DIR, 'snapshots');

/**
 * SQLite lives entirely as files; no container and no compose runtime.
 *
 * The v4 project resolves its DB filename relative to its own cwd, so a
 * pair-compatible path is written to the v4 scaffold in setup-v4-project.js.
 * For operations run from here in the v5 `complex/` project, we use the same
 * filename so snapshots produced by either side are interchangeable.
 */
const DATABASE_FILENAME =
  process.env.SQLITE_DATABASE_FILENAME ||
  process.env.DATABASE_FILENAME ||
  path.join(COMPLEX_DIR, '..', 'complex-v4', '.tmp', 'data.db');

const command = process.argv[2];
const snapshotName = process.argv[3];

function ensureSnapshotsDir() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

function snapshotPath(name) {
  return path.join(SNAPSHOTS_DIR, `sqlite-${name}.db`);
}

function requireBetterSqlite() {
  try {
    // eslint-disable-next-line global-require
    return require('better-sqlite3');
  } catch (error) {
    throw new Error(
      'better-sqlite3 is required for sqlite operations. It is a peer dep of @strapi/strapi and should be present via workspace hoisting; if not, install it in examples/complex.'
    );
  }
}

switch (command) {
  case 'start':
    // No-op: sqlite is file-based.
    console.log('✅ SQLite is file-based; nothing to start.');
    console.log(`   Database file: ${DATABASE_FILENAME}`);
    break;

  case 'stop':
    // No-op: sqlite is file-based.
    console.log('✅ SQLite is file-based; nothing to stop.');
    break;

  case 'snapshot': {
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-sqlite.js snapshot <name>');
      process.exit(1);
    }
    if (!fs.existsSync(DATABASE_FILENAME)) {
      console.error(`Error: Database file not found: ${DATABASE_FILENAME}`);
      console.error('Run the v4 app with `yarn develop:sqlite` and seed first to create it.');
      process.exit(1);
    }
    ensureSnapshotsDir();
    const target = snapshotPath(snapshotName);
    fs.copyFileSync(DATABASE_FILENAME, target);
    console.log(`✅ Snapshot created: ${target}`);
    break;
  }

  case 'restore': {
    if (!snapshotName) {
      console.error('Error: Snapshot name is required');
      console.error('Usage: node db-sqlite.js restore <name>');
      process.exit(1);
    }
    const source = snapshotPath(snapshotName);
    if (!fs.existsSync(source)) {
      console.error(`Error: Snapshot not found: ${source}`);
      process.exit(1);
    }
    // Remove walk-ahead / shared-memory sidecars so they don't conflict with the
    // restored file's transaction state.
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const sidecar = `${DATABASE_FILENAME}${suffix}`;
      if (fs.existsSync(sidecar)) {
        try {
          fs.unlinkSync(sidecar);
        } catch {
          /* best-effort */
        }
      }
    }
    fs.mkdirSync(path.dirname(DATABASE_FILENAME), { recursive: true });
    fs.copyFileSync(source, DATABASE_FILENAME);
    console.log(`✅ Snapshot restored: ${snapshotName} -> ${DATABASE_FILENAME}`);
    break;
  }

  case 'wipe':
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const f = `${DATABASE_FILENAME}${suffix}`;
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    }
    console.log(`✅ SQLite database file removed: ${DATABASE_FILENAME}`);
    break;

  case 'check': {
    if (!fs.existsSync(DATABASE_FILENAME)) {
      console.log('📊 No database file found (empty or wiped)');
      break;
    }
    const Database = requireBetterSqlite();
    const db = new Database(DATABASE_FILENAME, { readonly: true, fileMustExist: true });
    try {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all();

      if (tables.length === 0) {
        console.log('📊 No tables found (database is empty or wiped)');
        break;
      }

      console.log('📊 Database Tables (row counts):\n');
      console.log('Table Name                          | Row Count');
      console.log('------------------------------------|----------');

      for (const { name } of tables) {
        // SQLite doesn't keep approximate row stats; use exact COUNT(*) here.
        const { c } = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get();
        const padded = name.padEnd(35);
        console.log(`${padded} | ${c}`);
      }
    } finally {
      db.close();
    }
    break;
  }

  default:
    console.error('Error: Unknown command');
    console.error('Usage: node db-sqlite.js <start|stop|snapshot|restore|wipe|check> [name]');
    process.exit(1);
}
