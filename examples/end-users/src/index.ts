import type { Core } from '@strapi/strapi';

import { seedExample } from './seed';

type Harness = typeof import('../e2e-migration/harness');

// Loaded only when the migration test run asks for it, so this file works when it is copied
// without the `e2e-migration` folder
const migrationHarness = (): Harness | undefined =>
  process.env.END_USERS_E2E_MIGRATION ? require('../e2e-migration/harness') : undefined;

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    migrationHarness()?.pointAuthorAtUsersPermissions(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * The end-users plugin has bootstrapped by now (its roles exist), so this is where the example
   * puts its sign-up fields and article permissions in place: see `seed.ts`.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // There is no end-user type to seed in a start that is checking or has not yet migrated
    if (migrationHarness()?.withoutEndUsersType()) {
      return;
    }

    await seedExample(strapi);
  },
};
