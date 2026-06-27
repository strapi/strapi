import type { MigrationRunnerFn } from './common';
import type { createStorage } from './storage';

export interface MigrationMeta {
  name: string;
  path?: string;
}

export interface RunnableMigration extends MigrationMeta {
  up: MigrationRunnerFn;
  down: MigrationRunnerFn;
}

export interface MigrationRunnerLogger {
  info(message: unknown): void;
}

export interface MigrationRunnerOptions {
  storage: ReturnType<typeof createStorage>;
  logger: MigrationRunnerLogger;
  getMigrations: () => Promise<RunnableMigration[]>;
}

const logEvent = (
  logger: MigrationRunnerLogger,
  event: string,
  name: string,
  extra?: Record<string, unknown>
) => {
  logger.info({ event, name, ...extra });
};

export const createMigrationRunner = (opts: MigrationRunnerOptions) => {
  const getPendingMigrations = async (): Promise<RunnableMigration[]> => {
    const [migrations, executedNames] = await Promise.all([
      opts.getMigrations(),
      opts.storage.executed(),
    ]);

    const executedSet = new Set(executedNames);
    return migrations.filter((migration) => !executedSet.has(migration.name));
  };

  const getExecutedMigrations = async (): Promise<RunnableMigration[]> => {
    const [migrations, executedNames] = await Promise.all([
      opts.getMigrations(),
      opts.storage.executed(),
    ]);

    const executedSet = new Set(executedNames);
    return migrations.filter((migration) => executedSet.has(migration.name));
  };

  return {
    async pending(): Promise<MigrationMeta[]> {
      const pending = await getPendingMigrations();
      return pending.map(({ name, path }) => ({ name, path }));
    },

    async up(): Promise<MigrationMeta[]> {
      const toBeApplied = await getPendingMigrations();

      for (const migration of toBeApplied) {
        const start = Date.now();

        logEvent(opts.logger, 'migrating', migration.name);

        await migration.up();
        await opts.storage.logMigration({ name: migration.name });

        const durationSeconds = (Date.now() - start) / 1000;
        logEvent(opts.logger, 'migrated', migration.name, { durationSeconds });
      }

      return toBeApplied.map(({ name, path }) => ({ name, path }));
    },

    async down(): Promise<MigrationMeta[]> {
      const executedReversed = (await getExecutedMigrations()).slice().reverse();
      const toBeReverted = executedReversed.slice(0, 1);

      for (const migration of toBeReverted) {
        const start = Date.now();

        logEvent(opts.logger, 'reverting', migration.name);

        await migration.down();
        await opts.storage.unlogMigration({ name: migration.name });

        const durationSeconds = Number.parseFloat(((Date.now() - start) / 1000).toFixed(3));
        logEvent(opts.logger, 'reverted', migration.name, { durationSeconds });
      }

      return toBeReverted.map(({ name, path }) => ({ name, path }));
    },
  };
};
