import type { Modules } from '@strapi/types';

import type { Database } from '..';

export interface UserMigrationProvider {
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

export type InternalMigrationProvider = Modules.Database.InternalMigrationProvider;
export type MigrationProvider = Modules.Database.MigrationProvider;

export type Context = { db: Database };

export type MigrationResolverParams = {
  name: string;
  path?: string;
  context: Context;
};

export type MigrationRunnerFn = () => Promise<void> | Promise<Promise<void>>;

export type MigrationResolver = (params: MigrationResolverParams) => {
  name: string;
  path?: string;
  up: MigrationRunnerFn;
  down: MigrationRunnerFn;
};

export type MigrationFn = Modules.Database.MigrationFn;
export type Migration = Modules.Database.Migration;

export const wrapTransaction = (db: Database) => (fn: MigrationFn) => () => {
  return db.transaction(({ trx }) => Promise.resolve(fn(trx, db)));
};
