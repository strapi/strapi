'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { createStrapiInstance } = require('./strapi');

const DATABASE_DIR = 'database';
const META_FILE = 'meta.json';
const TABLES_FILE = 'tables.json';
const SQLITE_DUMP_FILE = 'data.db';

const normalizeClient = (client) => {
  if (client === 'pg') {
    return 'postgres';
  }
  return client;
};

const readDatabaseMeta = (appDir) => {
  const envPath = path.join(appDir, '.env');
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath, 'utf8')) : {};

  const client = normalizeClient(env.DATABASE_CLIENT || 'sqlite');

  return {
    client,
    connection: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      database: env.DATABASE_NAME,
      username: env.DATABASE_USERNAME,
      password: env.DATABASE_PASSWORD,
      filename: env.DATABASE_FILENAME,
      schema: env.DATABASE_SCHEMA,
    },
  };
};

const resolveSqlitePath = (appDir, filename) => {
  const relative = filename || './tmp/data.db';
  return path.isAbsolute(relative) ? relative : path.join(appDir, relative);
};

const SQLITE_SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'];

/** Remove SQLite sidecar files so a restored data.db is not merged with stale WAL state. */
const removeSqliteSidecars = async (dbPath) => {
  await Promise.all(
    SQLITE_SIDECAR_SUFFIXES.map((suffix) => fs.promises.rm(`${dbPath}${suffix}`, { force: true }))
  );
};

const writeMeta = async (goldenDatabaseDir, meta) => {
  await fs.promises.writeFile(
    path.join(goldenDatabaseDir, META_FILE),
    JSON.stringify(meta, null, 2),
    'utf8'
  );
};

const readMeta = async (goldenDatabaseDir) => {
  const raw = await fs.promises.readFile(path.join(goldenDatabaseDir, META_FILE), 'utf8');
  return JSON.parse(raw);
};

/**
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @param {string} goldenDir
 */
const captureDatabase = async (strapi, goldenDir) => {
  const appDir = path.dirname(process.env.ENV_PATH);
  const goldenDatabaseDir = path.join(goldenDir, DATABASE_DIR);
  await fs.promises.mkdir(goldenDatabaseDir, { recursive: true });

  const { client: envClient, connection } = readDatabaseMeta(appDir);
  const client = strapi ? normalizeClient(strapi.db.config.connection.client) : envClient;
  const meta = { client, capturedAt: new Date().toISOString() };

  if (client === 'sqlite') {
    const filename = strapi?.config?.get('database.connection.filename') ?? connection.filename;
    const sqlitePath = resolveSqlitePath(appDir, filename);
    if (!fs.existsSync(sqlitePath)) {
      throw new Error(`golden-snapshot: sqlite database file not found at ${sqlitePath}`);
    }
    await removeSqliteSidecars(sqlitePath);
    await fs.promises.copyFile(sqlitePath, path.join(goldenDatabaseDir, SQLITE_DUMP_FILE));
    meta.sqliteFilename = filename;
    await writeMeta(goldenDatabaseDir, meta);
    return meta;
  }

  if (client !== 'postgres' && client !== 'mysql') {
    throw new Error(`golden-snapshot: unsupported database client "${client}"`);
  }

  const tables = await strapi.db.dialect.schemaInspector.getTables();
  const data = {};

  for (const tableName of tables) {
    data[tableName] = await strapi.db.connection(tableName).select('*');
  }

  await fs.promises.writeFile(
    path.join(goldenDatabaseDir, TABLES_FILE),
    JSON.stringify({ tables, data }),
    'utf8'
  );

  await writeMeta(goldenDatabaseDir, meta);
  return meta;
};

const restoreSqliteFile = async (appDir, goldenDatabaseDir, meta) => {
  const source = path.join(goldenDatabaseDir, SQLITE_DUMP_FILE);
  if (!fs.existsSync(source)) {
    throw new Error(`golden-snapshot: missing sqlite dump at ${source}`);
  }

  const target = resolveSqlitePath(appDir, meta.sqliteFilename);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await removeSqliteSidecars(target);
  await fs.promises.copyFile(source, target);
  await removeSqliteSidecars(target);
};

/**
 * Drop CTB tables and restore baseline rows using an already-booted Strapi instance.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @param {string} goldenDatabaseDir
 */
const disableForeignKeyChecks = async (strapi, client) => {
  if (client === 'postgres') {
    await strapi.db.connection.raw('SET session_replication_role = replica');
    return;
  }

  if (client === 'mysql') {
    await strapi.db.connection.raw('SET FOREIGN_KEY_CHECKS = 0');
  }
};

const enableForeignKeyChecks = async (strapi, client) => {
  if (client === 'postgres') {
    await strapi.db.connection.raw('SET session_replication_role = DEFAULT');
    return;
  }

  if (client === 'mysql') {
    await strapi.db.connection.raw('SET FOREIGN_KEY_CHECKS = 1');
  }
};

const dropTableCascade = async (strapi, client, tableName) => {
  const schema = strapi.db.getSchemaConnection();

  if (client === 'postgres') {
    await schema.raw('DROP TABLE IF EXISTS ?? CASCADE', [tableName]);
    return;
  }

  if (client === 'mysql') {
    await schema.raw('DROP TABLE IF EXISTS ??', [tableName]);
    return;
  }

  await schema.schema.dropTableIfExists(tableName);
};

const restoreRelationalFromSnapshot = async (strapi, goldenDatabaseDir) => {
  const tablesPath = path.join(goldenDatabaseDir, TABLES_FILE);
  if (!fs.existsSync(tablesPath)) {
    throw new Error(`golden-snapshot: missing tables snapshot at ${tablesPath}`);
  }

  const snapshot = JSON.parse(await fs.promises.readFile(tablesPath, 'utf8'));
  const goldenTables = new Set(snapshot.tables);
  const currentTables = await strapi.db.dialect.schemaInspector.getTables();
  const client = normalizeClient(strapi.db.config.connection.client);

  await strapi.db.dialect.startSchemaUpdate();
  await disableForeignKeyChecks(strapi, client);

  try {
    for (const tableName of currentTables) {
      if (!goldenTables.has(tableName)) {
        await dropTableCascade(strapi, client, tableName);
      }
    }

    for (const tableName of snapshot.tables) {
      await strapi.db.connection(tableName).del();

      const rows = snapshot.data[tableName];
      if (rows?.length > 0) {
        await strapi.db.connection(tableName).insert(rows);
      }
    }
  } finally {
    await enableForeignKeyChecks(strapi, client);
    await strapi.db.dialect.endSchemaUpdate();
  }
};

/**
 * Restore database half of the golden snapshot (after filesystem restore).
 */
const restoreDatabase = async (goldenDir) => {
  const appDir = path.dirname(process.env.ENV_PATH);
  const goldenDatabaseDir = path.join(goldenDir, DATABASE_DIR);
  const meta = await readMeta(goldenDatabaseDir);

  if (meta.client === 'sqlite') {
    await restoreSqliteFile(appDir, goldenDatabaseDir, meta);
    return;
  }

  if (meta.client !== 'postgres' && meta.client !== 'mysql') {
    throw new Error(`golden-snapshot: unsupported database client "${meta.client}"`);
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'aSecret';
  const strapi = await createStrapiInstance({ logLevel: 'error' });

  try {
    await restoreRelationalFromSnapshot(strapi, goldenDatabaseDir);
  } finally {
    await strapi.destroy();
  }
};

const databaseSnapshotExists = (goldenDir) => {
  const goldenDatabaseDir = path.join(goldenDir, DATABASE_DIR);
  if (!fs.existsSync(path.join(goldenDatabaseDir, META_FILE))) {
    return false;
  }

  const hasSqlite = fs.existsSync(path.join(goldenDatabaseDir, SQLITE_DUMP_FILE));
  const hasRelational = fs.existsSync(path.join(goldenDatabaseDir, TABLES_FILE));
  return hasSqlite || hasRelational;
};

module.exports = {
  DATABASE_DIR,
  captureDatabase,
  restoreDatabase,
  databaseSnapshotExists,
  normalizeClient,
  readDatabaseMeta,
  removeSqliteSidecars,
  resolveSqlitePath,
};
