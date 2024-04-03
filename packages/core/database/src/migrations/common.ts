import type { Resolver } from 'umzug';
import type { Knex } from 'knex';

import type { Database } from '..';

export interface UserMigrationProvider {
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

export interface InternalMigrationProvider {
  register(migration: Migration): void;
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}
export interface MigrationProvider {
  providers: { internal: InternalMigrationProvider };
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

export type Context = { db: Database };

export type MigrationResolver = Resolver<Context>;

export type MigrationFn = (knex: Knex.Transaction, db: Database) => Promise<void>;

export type Migration = {
  name: string;
  up: MigrationFn;
  down: MigrationFn;
};

export const wrapTransaction = (db: Database) => (fn: MigrationFn) => () => {
  return db.transaction(({ trx }) => Promise.resolve(fn(trx, db)));
};
