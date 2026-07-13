import knex from 'knex';
import type { Knex } from 'knex';
import { merge } from 'lodash/fp';

const clientMap = {
  sqlite: 'better-sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};

/**
 * Optional read-replica (reader endpoint) configuration. Anything omitted here
 * is inherited from the writer connection, so a typical Aurora setup only needs
 * to override `connection.host`.
 */
export interface ReadReplicaConfig {
  connection?: Knex.Config['connection'];
  pool?: Knex.Config['pool'];
}

/**
 * A Knex config extended with an optional `readReplica`. `readReplica` is a
 * Strapi-owned field and must never be passed to Knex itself.
 */
export type ConnectionConfig = Knex.Config & { readReplica?: ReadReplicaConfig };

function isClientValid<T extends { client?: unknown }>(
  config: T
): config is T & { client: keyof typeof clientMap } {
  return Object.keys(clientMap).includes(config.client as string);
}

/**
 * Derive the reader Knex config from a user connection config by inheriting the
 * writer config and applying the `readReplica` overrides. Returns `undefined`
 * when no replica is configured. The `readReplica` key is stripped from the
 * result so it never reaches Knex.
 */
export const buildReaderConfig = (userConfig: ConnectionConfig): Knex.Config | undefined => {
  const { readReplica, ...writer } = userConfig;

  if (!readReplica) {
    return undefined;
  }

  // A partial object override cannot inherit the writer's embedded credentials
  // when the writer connection is a connection string (or function), because
  // there is nothing to deep-merge into. Require a complete reader connection
  // instead of silently building one that has lost user/password/database.
  if (
    readReplica.connection &&
    typeof readReplica.connection === 'object' &&
    writer.connection &&
    typeof writer.connection !== 'object'
  ) {
    throw new Error(
      'database: `connection.readReplica.connection` must be a full connection string when the writer `connection` is a connection string or function; a partial object cannot inherit its credentials.'
    );
  }

  // The reader inherits the writer config and applies the `readReplica`
  // overrides (typically just `connection.host`). `merge` (immutable) deep-merges
  // so credentials/pool/ssl are inherited while matching keys are overridden;
  // `readReplica` is already stripped above so it never reaches Knex.
  return merge(writer, readReplica) as Knex.Config;
};

export const createConnection = (
  userConfig: ConnectionConfig,
  strapiConfig?: Partial<Knex.Config>
) => {
  if (!isClientValid(userConfig)) {
    throw new Error(`Unsupported database client ${userConfig.client}`);
  }

  // `readReplica` is Strapi-owned and must not be forwarded to Knex.
  const { readReplica, ...connectionConfig } = userConfig;

  const knexConfig: Knex.Config = {
    ...connectionConfig,
    client: clientMap[userConfig.client as keyof typeof clientMap],
  };

  // initialization code to run upon opening a new connection
  if (strapiConfig?.pool?.afterCreate) {
    knexConfig.pool = knexConfig.pool || {};
    // if the user has set their own afterCreate in config, we will replace it and call it
    const userAfterCreate = knexConfig.pool?.afterCreate;
    const strapiAfterCreate = strapiConfig.pool.afterCreate;
    knexConfig.pool.afterCreate = (
      conn: unknown,
      done: (err: Error | null | undefined, connection: any) => void
    ) => {
      strapiAfterCreate(conn, (err: Error | null | undefined, nativeConn: any) => {
        if (err) {
          return done(err, nativeConn);
        }
        if (userAfterCreate) {
          return userAfterCreate(nativeConn, done);
        }
        return done(null, nativeConn);
      });
    };
  }

  return knex(knexConfig);
};

/**
 * Build the read-replica Knex connection, reusing the same `strapiConfig`
 * (notably `pool.afterCreate`) as the writer so the reader pool runs the same
 * per-connection dialect initialization (pg type parsers, `search_path`).
 * Returns `undefined` when no replica is configured.
 */
export const createReadReplicaConnection = (
  userConfig: ConnectionConfig,
  strapiConfig?: Partial<Knex.Config>
) => {
  const readerConfig = buildReaderConfig(userConfig);

  if (!readerConfig) {
    return undefined;
  }

  // A reader endpoint only makes sense for client/server databases. sqlite is a
  // local file with no replica, so a second pool would be meaningless.
  if (userConfig.client === 'sqlite') {
    throw new Error('database: `readReplica` is not supported for the sqlite client.');
  }

  // `readerConfig` already carries the writer's `client` (inherited via merge).
  return createConnection(readerConfig, strapiConfig);
};
