import knex from 'knex';
import type { Knex } from 'knex';

const clientMap = {
  sqlite: 'better-sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};

function isClientValid(config: { client?: unknown }): config is { client: keyof typeof clientMap } {
  return Object.keys(clientMap).includes(config.client as string);
}

export const createConnection = (userConfig: Knex.Config, strapiConfig?: Partial<Knex.Config>) => {
  if (!isClientValid(userConfig)) {
    throw new Error(`Unsupported database client ${userConfig.client}`);
  }

  const knexConfig: Knex.Config = { ...userConfig, client: (clientMap as any)[userConfig.client] };

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
