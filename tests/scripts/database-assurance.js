'use strict';

/**
 * CI database assurance for the API test action.
 *
 * The expected client is parsed from the raw DB_OPTIONS string (`--dbclient` only).
 * It must not come from resolveDatabaseConfig or from generated files: those layers
 * used to leave a postgres job on sqlite.
 */

const path = require('path');
const { rowsFromRaw } = require('../api/utils/raw-rows');

const CLIENTS = ['postgres', 'mysql', 'sqlite'];
const CLIENT_SET = new Set(CLIENTS);
const DBCLIENT_FLAG = '--dbclient';

const IDENTITY_SQL = {
  postgres: 'SELECT current_database() AS database, version() AS version',
  // MySQL 9 rejects an unquoted `database` alias (reserved word).
  mysql: 'SELECT DATABASE() AS `database`, VERSION() AS `version`',
  // sqlite_version() does not name a database. `main` is filled in after the version check.
  sqlite: 'SELECT sqlite_version() AS version',
};

const extractExpectedClient = (dbOptions) => {
  if (typeof dbOptions !== 'string') {
    throw new Error('DB_OPTIONS must be a string containing --dbclient');
  }

  if (/[\r\n]/.test(dbOptions)) {
    throw new Error('DB_OPTIONS must be a single line; refusing to guess the database client');
  }

  // CI uses `--dbclient=postgres`. script.sh also word-splits DB_OPTIONS into yargs, which
  // accepts `--dbclient postgres`, so both forms are real invocation syntax.
  const tokens = dbOptions
    .trim()
    .split(/[ \t]+/)
    .filter(Boolean);
  const values = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === DBCLIENT_FLAG) {
      const next = tokens[index + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('DB_OPTIONS --dbclient is missing a value');
      }
      values.push(unquoteFlagValue(next));
      index += 1;
      continue;
    }

    if (token.startsWith(`${DBCLIENT_FLAG}=`)) {
      values.push(unquoteFlagValue(token.slice(`${DBCLIENT_FLAG}=`.length)));
    }
  }

  if (values.length === 0) {
    throw new Error(
      'DB_OPTIONS does not include --dbclient; refusing to default the database client'
    );
  }

  if (values.length > 1) {
    throw new Error('DB_OPTIONS includes multiple --dbclient values; refusing to guess');
  }

  const client = values[0];
  if (!CLIENT_SET.has(client)) {
    throw new Error(`DB_OPTIONS --dbclient "${client}" is not one of ${CLIENTS.join(', ')}`);
  }

  return client;
};

const unquoteFlagValue = (value) => {
  if (value.length >= 2) {
    const opener = value[0];
    const closer = value[value.length - 1];
    if ((opener === '"' || opener === "'") && closer === opener) {
      return value.slice(1, -1);
    }
  }

  if (value.includes('"') || value.includes("'")) {
    throw new Error('DB_OPTIONS has an ambiguous quoted --dbclient value');
  }

  return value;
};

const readGeneratedDatabaseClient = (envText) => {
  if (typeof envText !== 'string' || envText.trim() === '') {
    throw new Error('Generated test-apps/api/.env is empty');
  }

  const values = [];

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (key !== 'DATABASE_CLIENT') {
      continue;
    }

    values.push(unquoteEnvValue(trimmed.slice(separator + 1).trim()));
  }

  if (values.length !== 1) {
    throw new Error(
      `Generated test-apps/api/.env must contain exactly one DATABASE_CLIENT assignment (found ${values.length})`
    );
  }

  if (!values[0]) {
    throw new Error('Generated test-apps/api/.env has an empty DATABASE_CLIENT');
  }

  return values[0];
};

const unquoteEnvValue = (value) => {
  if (value.length >= 2) {
    const opener = value[0];
    const closer = value[value.length - 1];
    if ((opener === '"' || opener === "'") && closer === opener) {
      return value.slice(1, -1);
    }
  }

  return value;
};

const assertGeneratedClientMatches = (expected, actual) => {
  if (actual !== expected) {
    throw new Error(
      `Database client mismatch: API job requested ${expected} but generated test-apps/api/.env has DATABASE_CLIENT=${actual}`
    );
  }
};

const assertDialectIdentity = (client, rawResult) => {
  if (!CLIENT_SET.has(client)) {
    throw new Error(`Cannot verify identity for unknown database client "${client}"`);
  }

  const rows = rowsFromRaw(rawResult);
  if (rows.length !== 1) {
    throw new Error(
      `Database identity query for ${client} returned ${rows.length} rows; expected 1`
    );
  }

  const row = normalizeIdentityRow(rows[0]);
  const version = oneLine(stringValue(row.version));
  const databaseFromRow = oneLine(stringValue(row.database));
  const database = client === 'sqlite' ? databaseFromRow || 'main' : databaseFromRow;

  assertPrintableIdentity(database, version);

  if (client === 'postgres') {
    if (!database) {
      throw new Error('Postgres identity check failed: current_database() is empty');
    }
    if (!/PostgreSQL/.test(version) || !/\d/.test(version)) {
      throw new Error(`Postgres identity check failed: version "${version}" is not PostgreSQL`);
    }
  } else if (client === 'mysql') {
    if (!database) {
      throw new Error('MySQL identity check failed: DATABASE() is empty');
    }
    // Accept MariaDB version strings (for example 10.11.6-MariaDB). Reject an empty
    // version and identities that belong to a different engine.
    if (!version || !/\d/.test(version) || /PostgreSQL|sqlite/i.test(version)) {
      throw new Error(`MySQL identity check failed: version "${version}" is not MySQL-compatible`);
    }
  } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`SQLite identity check failed: sqlite_version() returned "${version}"`);
  }

  return { client, database, version };
};

const normalizeIdentityRow = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Database identity query returned an unexpected row');
  }

  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[String(key).toLowerCase()] = value;
  }
  return normalized;
};

const stringValue = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
};

const oneLine = (value) =>
  value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

const assertPrintableIdentity = (database, version) => {
  for (const [label, value] of [
    ['database', database],
    ['version', version],
  ]) {
    if (/:\/\//.test(value) || /\bpassword\b/i.test(value)) {
      throw new Error(`Database identity ${label} is not safe to print`);
    }
  }
};

const verifyRuntimeDatabase = async ({ expected, loadInstance, queryRaw }) => {
  if (typeof loadInstance !== 'function') {
    throw new Error('loadInstance must be a function');
  }

  let instance;
  let failure;
  let identity;

  try {
    instance = await loadInstance();
    if (!instance || typeof instance.load !== 'function') {
      throw new Error('Failed to load the generated API test app');
    }

    await instance.load();

    const actual = instance.db?.dialect?.client;
    if (actual !== expected) {
      throw new Error(
        `Database client mismatch: API job requested ${expected} but the loaded API test app dialect is ${actual || 'unknown'}`
      );
    }

    const sql = IDENTITY_SQL[expected];
    const runRaw =
      queryRaw ||
      ((loaded, statement) => {
        if (typeof loaded?.db?.connection?.raw !== 'function') {
          throw new Error('Loaded API test app has no database connection');
        }
        return loaded.db.connection.raw(statement);
      });

    let rawResult;
    try {
      rawResult = await runRaw(instance, sql);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Database identity query failed for ${expected}: ${redactSecrets(reason)}`);
    }

    identity = assertDialectIdentity(expected, rawResult);
  } catch (error) {
    failure = error;
  } finally {
    if (instance && typeof instance.destroy === 'function') {
      try {
        await instance.destroy();
      } catch (destroyError) {
        if (!failure) {
          failure = destroyError;
        }
      }
    }
  }

  if (failure) {
    throw failure;
  }

  return identity;
};

/**
 * Load the generated API app the same way the Jest helper does: ENV_PATH is set
 * before @strapi/core's import-time dotenv read, and appDir/distDir are the
 * directory that contains that .env file.
 *
 * Must run in its own process. Strapi's destroy() removes process listeners.
 */
const createApiTestAppLoader = (envPath) => {
  if (typeof envPath !== 'string' || envPath.trim() === '') {
    throw new Error('ENV_PATH is not set');
  }

  const resolvedEnvPath = path.resolve(envPath);

  return async function loadGeneratedApiInstance() {
    process.env.ENV_PATH = resolvedEnvPath;
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'test';
    }

    // Required after ENV_PATH is assigned. @strapi/core reads it while the module loads.
    // eslint-disable-next-line import/no-extraneous-dependencies -- same package the API test helper loads
    const { createStrapi } = require('@strapi/strapi');
    const baseDir = path.dirname(resolvedEnvPath);

    return createStrapi({
      appDir: baseDir,
      distDir: baseDir,
      autoReload: true,
    });
  };
};

const formatExpectedClient = (client) => `API database assurance: expected client=${client}`;

const formatGeneratedClient = (client) => `Generated API test app DATABASE_CLIENT=${client}`;

const formatRuntimeAssurance = (identity) =>
  `API database assurance: client=${identity.client} database=${identity.database} version=${identity.version}`;

const redactSecrets = (message) =>
  String(message)
    .replace(/(password\s*[:=]\s*)(['"]?)[^\s,'"]+\2/gi, '$1[redacted]')
    .replace(/(DATABASE_PASSWORD\s*[:=]\s*)(['"]?)[^\s,'"]+\2/g, '$1[redacted]');

module.exports = {
  CLIENTS,
  IDENTITY_SQL,
  extractExpectedClient,
  readGeneratedDatabaseClient,
  assertGeneratedClientMatches,
  assertDialectIdentity,
  verifyRuntimeDatabase,
  createApiTestAppLoader,
  formatExpectedClient,
  formatGeneratedClient,
  formatRuntimeAssurance,
  redactSecrets,
};
