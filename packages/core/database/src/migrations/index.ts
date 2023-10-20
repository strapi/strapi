import { createUserMigrationProvider } from './users';
import { createInternalMigrationProvider } from './internal';

import type { MigrationProvider } from './common';
import type { Database } from '..';

export type { MigrationProvider };

export const createMigrationsProvider = (db: Database): MigrationProvider => {
  const providers = [createUserMigrationProvider(db), createInternalMigrationProvider(db)];

  return {
    async shouldRun() {
      const shouldRunResponses = await Promise.all(
        providers.map((provider) => provider.shouldRun())
      );

      return shouldRunResponses.some((shouldRun) => shouldRun);
    },
    async up() {
      for (const provider of providers) {
        if (await provider.shouldRun()) {
          await provider.up();
        }
      }
    },
    async down() {
      for (const provider of providers) {
        if (await provider.shouldRun()) {
          await provider.down();
        }
      }
    },
  };
};
