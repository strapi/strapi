import knex from 'knex';
import type { Knex } from 'knex';

export const createConnection = (config: Knex.Config) => {
  const knexConfig = { ...config };

  return knex(knexConfig);
};
