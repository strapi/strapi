import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { App } from '../app/generate';
import { SQLITE_RESTORE_MARKER_FILE, SQLITE_SNAPSHOT_FILE } from '../test-plugin';

/**
 * The database a test app runs on. SQLite is a file in the app; Postgres and MySQL are servers,
 * where each app gets its own database (see `databaseName`).
 */
export type Database =
  | { client: 'sqlite' }
  | {
      client: 'postgres' | 'mysql';
      host: string;
      port: number;
      user: string;
      password: string;
    };

export type DatabaseClient = Database['client'];

export const SQLITE: Database = { client: 'sqlite' };

/**
 * The database of this run, from `TESTS_DATABASE` (`sqlite`, `postgres` or `mysql`, default
 * `sqlite`) and the `TESTS_DATABASE_HOST`, `_PORT`, `_USER` and `_PASSWORD` connection settings.
 * The defaults match the CI database services (`.github/workflows/tests.yml`).
 */
export const databaseFromEnv = (env: NodeJS.ProcessEnv = process.env): Database => {
  const client = (env.TESTS_DATABASE ?? 'sqlite') as DatabaseClient;

  if (client === 'sqlite') {
    return SQLITE;
  }
  if (client !== 'postgres' && client !== 'mysql') {
    throw new Error(`TESTS_DATABASE must be sqlite, postgres or mysql, got "${client}".`);
  }

  return {
    client,
    host: env.TESTS_DATABASE_HOST ?? '127.0.0.1',
    port: Number(env.TESTS_DATABASE_PORT ?? (client === 'postgres' ? 5432 : 3306)),
    // Creating and dropping databases needs an admin account: the Postgres image's user is a
    // superuser, MySQL needs root.
    user: env.TESTS_DATABASE_USER ?? (client === 'postgres' ? 'strapi' : 'root'),
    password: env.TESTS_DATABASE_PASSWORD ?? 'strapi',
  };
};

/** Postgres keeps the first 63 bytes of a name (MySQL 64). */
const MAX_DATABASE_NAME_LENGTH = 63;

/**
 * One database per app, so a reset only touches its own instance. Every checkout uses the same
 * app names, so the name ends with a hash of the app dir: two worktrees on one database server
 * don't drop each other's database. For example `tests_api_1_3f2a9c0d1e`.
 */
export const databaseName = (app: App) => {
  const hash = crypto.createHash('sha256').update(app.dir).digest('hex').slice(0, 10);
  const slug = app.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const room = MAX_DATABASE_NAME_LENGTH - 'tests_'.length - hash.length - 1;
  return `tests_${slug.slice(0, room)}_${hash}`;
};

/** The app env that points Strapi at its database. */
export const databaseEnv = (app: App, database: Database): NodeJS.ProcessEnv => {
  if (database.client === 'sqlite') {
    return { DATABASE_CLIENT: 'sqlite', DATABASE_FILENAME: '.tmp/data.db' };
  }

  return {
    DATABASE_CLIENT: database.client,
    DATABASE_HOST: database.host,
    DATABASE_PORT: String(database.port),
    DATABASE_USERNAME: database.user,
    DATABASE_PASSWORD: database.password,
    DATABASE_NAME: databaseName(app),
    DATABASE_SSL: 'false',
  };
};

/**
 * Give the app an empty database, before Strapi boots and initializes it: delete the SQLite
 * file with its snapshot and a pending restore marker (else the next boot would copy the old
 * snapshot back), or drop and recreate the app's Postgres or MySQL database. Each API and CLI test file
 * calls it before starting its instance, so no file sees another file's data.
 */
export const resetDatabase = async (app: App, database: Database) => {
  if (database.client === 'sqlite') {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      fs.rmSync(`${app.dbFile}${suffix}`, { force: true });
    }
    for (const file of [SQLITE_SNAPSHOT_FILE, SQLITE_RESTORE_MARKER_FILE]) {
      fs.rmSync(path.join(path.dirname(app.dbFile), file), { force: true });
    }
    return;
  }

  const name = databaseName(app);
  // Loaded on demand: SQLite runs don't need the server drivers (pg, mysql2).
  const { default: knex } = await import('knex');
  const admin = knex({
    client: database.client === 'postgres' ? 'pg' : 'mysql2',
    connection: {
      host: database.host,
      port: database.port,
      user: database.user,
      password: database.password,
      // Postgres needs a database to connect to: any but the one being dropped.
      ...(database.client === 'postgres' ? { database: 'postgres' } : {}),
    },
    pool: { min: 0, max: 1 },
  });

  try {
    if (database.client === 'postgres') {
      await admin.raw(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.raw(`CREATE DATABASE "${name}"`);
    } else {
      await admin.raw(`DROP DATABASE IF EXISTS \`${name}\``);
      await admin.raw(`CREATE DATABASE \`${name}\``);
    }
  } finally {
    await admin.destroy();
  }
};
