import type { Core } from '@strapi/strapi';

import { pointAuthorAtUsersPermissions, withoutEndUsersType } from '../e2e-migration/harness';
import { seedExample } from './seed';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    pointAuthorAtUsersPermissions(strapi);
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
    if (withoutEndUsersType()) {
      return;
    }

    await seedExample(strapi);
  },
};
