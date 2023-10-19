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

export const createConnection = (config: Knex.Config) => {
  if (!isClientValid(config)) {
    throw new Error(`Unsupported database client ${config.client}`);
  }

  const knexConfig = { ...config, client: (clientMap as any)[config.client] };

  return knex(knexConfig);
};
