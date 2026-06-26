'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const GET_COUNTS_SCRIPT = path.join(__dirname, 'get-db-counts.js');

/**
 * Run get-db-counts.js with cwd = appPath and return parsed JSON state.
 * Used by CLI tests (e.g. import-export roundtrip) to read SQLite counts and IDs.
 *
 * @param {string} appPath - Path to the test app (must have .tmp/data.db and better-sqlite3)
 * @returns {{ articles: number, categories: number, articleIds: number[], categoryIds: number[], error?: string }}
 */
function getDbState(appPath) {
  const result = spawnSync('node', [GET_COUNTS_SCRIPT], {
    cwd: appPath,
    encoding: 'utf8',
    env: { ...process.env },
    maxBuffer: 1024 * 1024,
  });
  const out = String(result.stdout || '').trim();
  const err = String(result.stderr || '').trim();
  if (!out) {
    throw new Error(
      `get-db-counts produced no output (exit ${result.status}). stderr: ${err || '(none)'}`
    );
  }
  try {
    return JSON.parse(out);
  } catch (e) {
    throw new Error(`get-db-counts invalid JSON: ${out.slice(0, 200)}. stderr: ${err || '(none)'}`);
  }
}

module.exports = { getDbState };
