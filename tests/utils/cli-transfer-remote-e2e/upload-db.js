'use strict';

const path = require('path');
const { SEED_UPLOAD_NAME_LIKE } = require('./constants');

function loadBetterSqlite3(appPath) {
  try {
    // Test apps ship the native module; resolve from app first for correct binary.
    return require(path.join(appPath, 'node_modules', 'better-sqlite3'));
  } catch {
    return require('better-sqlite3');
  }
}

function openUploadsDbReadonly(appPath) {
  const Database = loadBetterSqlite3(appPath);
  const dbPath = path.join(appPath, '.tmp', 'data.db');
  return new Database(dbPath, { readonly: true });
}

function countUploadFiles(appPath) {
  const db = openUploadsDbReadonly(appPath);
  try {
    const row = db.prepare('SELECT COUNT(*) AS c FROM files').get();
    return row.c;
  } finally {
    db.close();
  }
}

/**
 * @returns {{ files: { name: string, hash: string, size: number }[] }}
 */
function getSeedUploadSignature(appPath) {
  const db = openUploadsDbReadonly(appPath);
  try {
    const rows = db
      .prepare(
        `SELECT name, hash, size FROM files
         WHERE name LIKE ?
         ORDER BY name ASC`
      )
      .all(SEED_UPLOAD_NAME_LIKE);
    return {
      files: rows.map((r) => ({
        name: r.name,
        hash: r.hash,
        size: Number(r.size),
      })),
    };
  } finally {
    db.close();
  }
}

module.exports = {
  countUploadFiles,
  getSeedUploadSignature,
};
