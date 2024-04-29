import { createUserMigrationProvider } from './users';
import { createInternalMigrationProvider } from './internal';

import type { MigrationProvider, Migration } from './common';
import type { Database } from '..';

export type { MigrationProvider, Migration };

export const createMigrationsProvider = (db: Database): MigrationProvider => {
  const userProvider = createUserMigrationProvider(db);
  const internalProvider = createInternalMigrationProvider(db);
  const providers = [userProvider, internalProvider];

  return {
    providers: {
      internal: internalProvider,
    },
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
