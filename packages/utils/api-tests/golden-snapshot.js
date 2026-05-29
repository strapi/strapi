'use strict';

const fs = require('fs');
const path = require('path');

const {
  captureDatabase,
  databaseSnapshotExists,
  readDatabaseMeta,
  restoreDatabase,
} = require('./golden-snapshot-database');

/** Paths under the test app dir that CTB mutates (relative to app root). */
const SNAPSHOT_DIRS = ['src/api', 'src/components'];

/**
 * Generated between test suites (not part of the golden baseline). Purged on restore so
 * stale OpenAPI / plugin artifacts cannot reference deleted CTB content types.
 */
const PURGE_ON_RESTORE = ['src/extensions/documentation/documentation'];

const SUPPORTED_CLIENTS = new Set(['sqlite', 'postgres', 'mysql']);

const getAppDir = () => {
  if (!process.env.ENV_PATH) {
    throw new Error('golden-snapshot: ENV_PATH is not set');
  }
  return path.dirname(process.env.ENV_PATH);
};

const getGoldenDir = (appDir = getAppDir()) => {
  const parent = path.dirname(appDir);
  const name = path.basename(appDir);
  return path.join(parent, '.golden', name);
};

const isGoldenRestoreSupported = (appDir = getAppDir()) => {
  const { client } = readDatabaseMeta(appDir);
  return SUPPORTED_CLIENTS.has(client);
};

const rm = async (target) => {
  await fs.promises.rm(target, { recursive: true, force: true });
};

const copyPath = async (source, dest) => {
  await fs.promises.cp(source, dest, { recursive: true, force: true });
};

const purgeGeneratedPaths = async (appDir) => {
  for (const rel of PURGE_ON_RESTORE) {
    await rm(path.join(appDir, rel));
  }
};

const captureFilesystem = async (appDir, goldenDir) => {
  for (const rel of SNAPSHOT_DIRS) {
    const src = path.join(appDir, rel);
    if (fs.existsSync(src)) {
      await copyPath(src, path.join(goldenDir, rel));
    }
  }
};

const restoreFilesystem = async (appDir, goldenDir) => {
  for (const rel of SNAPSHOT_DIRS) {
    const target = path.join(appDir, rel);
    const source = path.join(goldenDir, rel);
    await rm(target);
    if (fs.existsSync(source)) {
      await copyPath(source, target);
    } else {
      await fs.promises.mkdir(target, { recursive: true });
    }
  }
};

/**
 * Capture pristine test app filesystem + database (call after one Strapi bootstrap).
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} options
 */
const captureGoldenSnapshot = async ({ strapi }) => {
  const appDir = getAppDir();
  const { client } = readDatabaseMeta(appDir);

  if (!SUPPORTED_CLIENTS.has(client)) {
    throw new Error(
      `golden-snapshot: unsupported DATABASE_CLIENT "${client}" (expected sqlite, postgres, or mysql)`
    );
  }

  const goldenDir = getGoldenDir(appDir);
  await rm(goldenDir);
  await fs.promises.mkdir(goldenDir, { recursive: true });

  await captureFilesystem(appDir, goldenDir);

  // SQLite must be copied only after Strapi has closed the connection (and sidecars cleared).
  let dbMeta;
  if (client === 'sqlite') {
    await strapi.destroy();
    dbMeta = await captureDatabase(null, goldenDir);
  } else {
    dbMeta = await captureDatabase(strapi, goldenDir);
    await strapi.destroy();
  }

  return { goldenDir, client, dbMeta };
};

const goldenSnapshotExists = () => {
  const goldenDir = getGoldenDir();
  if (!fs.existsSync(goldenDir)) {
    return false;
  }

  const hasFilesystem = SNAPSHOT_DIRS.some((rel) => fs.existsSync(path.join(goldenDir, rel)));
  return hasFilesystem && databaseSnapshotExists(goldenDir);
};

/**
 * Restore schema dirs + database from the golden snapshot (alternative to builder.cleanup).
 */
const restoreGoldenSnapshot = async () => {
  const appDir = getAppDir();
  const goldenDir = getGoldenDir(appDir);

  if (!goldenSnapshotExists()) {
    throw new Error(
      `golden-snapshot: missing snapshot at ${goldenDir}. ` +
        'Run with --generate-app or ensure captureGoldenSnapshot() ran after generating the test app.'
    );
  }

  if (!isGoldenRestoreSupported(appDir)) {
    const { client } = readDatabaseMeta(appDir);
    throw new Error(`golden-snapshot: unsupported DATABASE_CLIENT "${client}"`);
  }

  await restoreFilesystem(appDir, goldenDir);
  await purgeGeneratedPaths(appDir);
  await restoreDatabase(goldenDir);
};

module.exports = {
  SNAPSHOT_DIRS,
  PURGE_ON_RESTORE,
  captureGoldenSnapshot,
  restoreGoldenSnapshot,
  goldenSnapshotExists,
  getAppDir,
  getGoldenDir,
  isGoldenRestoreSupported,
  readDatabaseMeta,
};
