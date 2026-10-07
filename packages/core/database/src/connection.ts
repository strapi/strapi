import knex from 'knex';
import type { Knex } from 'knex';

const clientMap = {
  sqlite: 'better-sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};

type ClientKind = keyof typeof clientMap;

export function isDatabaseClientKind(client: unknown): client is ClientKind {
  return (client as string) in clientMap;
}

export const createConnection = (userConfig: Knex.Config, strapiConfig?: Partial<Knex.Config>) => {
  if (!isDatabaseClientKind(userConfig.client)) {
    throw new Error(`Unsupported database client ${userConfig.client}`);
  }

  const knexConfig: Knex.Config = { ...userConfig, client: clientMap[userConfig.client] };

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

  const instance = knex(knexConfig);

  // knex up to 3.2.6 made `password` non-enumerable on the connection object it was given, which
  // is the live config object, so it stayed out of JSON.stringify and Object.keys. 3.2.7 clones the
  // config instead and hides it on the clone only, so do it here. The value is unchanged.
  const connection = userConfig.connection;
  if (
    typeof connection === 'object' &&
    connection !== null &&
    Object.prototype.hasOwnProperty.call(connection, 'password')
  ) {
    Object.defineProperty(connection, 'password', { enumerable: false });
  }

  return instance;
};
