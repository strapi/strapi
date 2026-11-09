import type { Core } from '@strapi/strapi';

import { seedExample } from './seed';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // The migration end-to-end run first starts this application as a project that still uses
    // Users & Permissions (see `config/plugins.ts`): the articles' author is that plugin's user
    // then, as it would be in such a project, because the end-users plugin is not there to point at.
    if (process.env.END_USERS_E2E_MIGRATION === 'seed') {
      const author = strapi.contentType('api::article.article').attributes.author as {
        target: string;
      };

      author.target = 'plugin::users-permissions.user';
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * The end-users plugin has bootstrapped by now (its roles exist), so this is where the example
   * puts its sign-up fields and article permissions in place: see `seed.ts`.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // There is no end-users plugin to seed in the first start of the migration end-to-end run
    if (process.env.END_USERS_E2E_MIGRATION === 'seed') {
      return;
    }

    await seedExample(strapi);
  },
};
