import { randomUUID } from 'node:crypto';
// knex is Strapi's own database layer (hoisted); only its types are used here
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import type { Knex } from 'knex';
import type { Core } from '@strapi/types';
import type { Database } from '@strapi/database';

import { readCompatConfig } from '../compat/config';
import { PLUGIN_ID } from '../constants';
import { readMigrationConfig } from './config';
import type { MigrationConfig } from './config';
import { claimPreSync, runPreSync } from './pre-sync';
import { readRecord, releaseMigration } from './record';
import type { MigrationRecord } from './record';

const UP_PLUGIN = 'users-permissions';
const UP_USERS_TABLE = 'up_users';
const EU_USERS_TABLE = 'eu_users';
const STORE_TABLE = 'strapi_core_store_settings';

/** What the start decides from: the config, the stored record and what the database holds */
export interface MigrationState {
  config: MigrationConfig;
  compat: boolean;
  /** The Users & Permissions plugin is loaded in this start */
  upLoaded: boolean;
  record: MigrationRecord | null;
  upUsersTable: boolean;
  /** `null` when the table does not exist */
  euUsersRows: number | null;
}

export type MigrationDecision =
  | { kind: 'none' }
  | { kind: 'check' }
  | { kind: 'migrate'; attempt: number }
  | { kind: 'rollback' }
  | { kind: 'cleanup' }
  | { kind: 'refuse'; message: string };

const refuse = (message: string): MigrationDecision => ({ kind: 'refuse', message });

const ROLLED_BACK_WHILE_SET =
  'The migration was rolled back, and migration.rollback is still set. Revert the commit that ' +
  'switched the config to end-users, or remove migration.rollback to migrate again, then deploy again.';

const ROLLED_BACK =
  'The migration was rolled back. Revert the commit that switched the config to end-users, or, to ' +
  'migrate again, set migration.fromUsersPermissions to true, then deploy again.';

export const decideMigration = (state: MigrationState): MigrationDecision => {
  const { config, compat, upLoaded, record, upUsersTable, euUsersRows } = state;
  const from = config.fromUsersPermissions;
  const notCleanedUp = record !== null && record.cleanedUpAt === null;

  if (from === 'check') {
    // Sync drops the end-users tables the dormant plugin has no types for: only empty ones may go
    if (upLoaded && ((euUsersRows !== null && euUsersRows > 0) || record !== null)) {
      return refuse(
        'migration.fromUsersPermissions is "check", but this database already holds end-users data ' +
          '(eu_users has users or a migration is recorded), and check mode would drop those tables. ' +
          'Set migration.fromUsersPermissions to false or remove it to keep running end-users, or ' +
          'restore a database without them.'
      );
    }

    return upLoaded
      ? { kind: 'check' }
      : refuse(
          'migration.fromUsersPermissions is "check", which reads users-permissions while it runs, ' +
            'and sync would drop its tables without it. Enable users-permissions again, or set ' +
            'migration.fromUsersPermissions to true to migrate.'
        );
  }

  if (upLoaded) {
    return { kind: 'none' };
  }

  if (config.rollback) {
    if (record?.status === 'completed' && compat && notCleanedUp) {
      return { kind: 'rollback' };
    }

    if (record?.status === 'rolled-back') {
      return refuse(ROLLED_BACK_WHILE_SET);
    }

    return refuse(
      record === null
        ? 'migration.rollback is set but there is nothing to roll back: no migration has run. ' +
            'Remove migration.rollback.'
        : 'migration.rollback is set but the migration cannot be rolled back: the compatibility ' +
            'mode is off or the old tables were cleaned up. Restore a backup instead.'
    );
  }

  if (record?.status === 'rolled-back') {
    return upUsersTable && from === true
      ? { kind: 'migrate', attempt: record.attempt + 1 }
      : refuse(ROLLED_BACK);
  }

  if (record?.status === 'completed') {
    return compat === false && notCleanedUp ? { kind: 'cleanup' } : { kind: 'none' };
  }

  if (record?.status === 'in-progress') {
    return { kind: 'migrate', attempt: Math.max(record.attempt, 1) };
  }

  if (upUsersTable) {
    if (from === true) {
      return euUsersRows !== null && euUsersRows > 0
        ? refuse(
            'migration.fromUsersPermissions is true, but eu_users already holds users, so the ' +
              'migration would mix two user tables. Empty eu_users, or set it to false.'
          )
        : { kind: 'migrate', attempt: 1 };
    }

    if (from === null) {
      return refuse(
        'The users-permissions tables exist and the migration was not asked for. Set ' +
          'migration.fromUsersPermissions to true to migrate (the project files do), or to false ' +
          'to drop the old tables.'
      );
    }
  }

  return { kind: 'none' };
};

/** Thrown to stop the start: a refusal, or a rollback that has finished */
export class MigrationStop extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationStop';
  }
}

export interface MigrationContext {
  strapi: Core.Strapi;
  config: MigrationConfig;
  compat: boolean;
  record: MigrationRecord | null;
  owner: string;
  /** The attempt this start runs: 1, or one more than the last that was rolled back */
  attempt: number;
  now: () => Date;
}

export type MigrationStepFn = (
  trx: Knex.Transaction,
  db: Database,
  ctx: MigrationContext
) => Promise<void>;

export interface MigrationSteps {
  preSync: MigrationStepFn;
  rollback: MigrationStepFn;
  cleanup: MigrationStepFn;
}

const stub =
  (name: string): MigrationStepFn =>
  async (_trx, _db, ctx) => {
    ctx.strapi.log.info(`${PLUGIN_ID}: migration step "${name}" is not available yet`);
  };

const readState = async (strapi: Core.Strapi): Promise<MigrationState> => {
  // A schema builder accumulates what is called on it: each question gets its own
  const hasTable = (name: string) => strapi.db.getSchemaConnection().hasTable(name);
  const upUsersTable = await hasTable(UP_USERS_TABLE);
  let euUsersRows: number | null = null;

  if (await hasTable(EU_USERS_TABLE)) {
    const row = await strapi.db.connection(EU_USERS_TABLE).count({ count: '*' }).first();

    euUsersRows = Number(row?.count ?? 0);
  }

  return {
    config: readMigrationConfig(strapi),
    compat: readCompatConfig(strapi).usersPermissions,
    upLoaded: Boolean(strapi.plugin(UP_PLUGIN)),
    // A first start has no core store yet: the record is read before sync makes it
    record: (await hasTable(STORE_TABLE)) ? await readRecord(strapi) : null,
    upUsersTable,
    euUsersRows,
  };
};

/**
 * Registers the start control: one `beforeSync` handler that decides from the config and the stored
 * record whether this start refuses, migrates (an internal migration that runs inside this start's
 * `sync()`, before the schema diff), rolls back, cleans up, or leaves things alone.
 */
export const registerMigrationControl = (
  strapi: Core.Strapi,
  steps: Partial<MigrationSteps> = {}
): void => {
  const run: MigrationSteps = {
    preSync: steps.preSync ?? runPreSync,
    rollback: steps.rollback ?? stub('rollback'),
    cleanup: steps.cleanup ?? stub('cleanup'),
  };

  strapi.hook('strapi::content-types.beforeSync').register(async () => {
    const state = await readState(strapi);
    const decision = decideMigration(state);
    const ctx: MigrationContext = {
      strapi,
      config: state.config,
      compat: state.compat,
      record: state.record,
      owner: randomUUID(),
      attempt: decision.kind === 'migrate' ? decision.attempt : 1,
      now: () => new Date(),
    };

    switch (decision.kind) {
      case 'migrate': {
        const refusal = await claimPreSync(strapi, state.config, ctx.owner);

        if (refusal) {
          throw new MigrationStop(refusal);
        }

        await strapi.db.migrations.providers.internal.register({
          name: `end-users-from-users-permissions-${decision.attempt}`,
          async up(trx: Knex.Transaction, db: Database) {
            try {
              await run.preSync(trx, db, ctx);
            } catch (error) {
              // Not awaited: the transaction still holds the only SQLite connection, and on
              // Postgres the row it wrote, so the release can only finish after the rollback
              releaseMigration(strapi, ctx.owner).catch((releaseError: unknown) => {
                strapi.log.warn(
                  `${PLUGIN_ID}: the migration claim could not be released (${String(releaseError instanceof Error ? releaseError.name : 'error')}); it runs out by itself`
                );
              });
              throw error;
            }
          },
          down: () => Promise.resolve(),
        });
        break;
      }
      case 'rollback':
        await strapi.db.transaction(({ trx }) => run.rollback(trx, strapi.db, ctx));
        throw new MigrationStop(
          'The migration was rolled back. Revert the commit that switched the config to end-users, ' +
            'remove migration.rollback, and deploy again.'
        );
      case 'cleanup':
        await strapi.db.transaction(({ trx }) => run.cleanup(trx, strapi.db, ctx));
        break;
      case 'refuse':
        throw new MigrationStop(decision.message);
      default:
        if (
          decision.kind === 'none' &&
          !state.upLoaded &&
          state.upUsersTable &&
          state.config.fromUsersPermissions === false &&
          state.record === null
        ) {
          strapi.log.warn(
            `${PLUGIN_ID}: the users-permissions tables are still in the database and ` +
              'migration.fromUsersPermissions is false, so they will be dropped.'
          );
        }
    }
  });
};
