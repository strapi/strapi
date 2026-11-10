import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // A document service middleware, checked by `checks/common-patterns.ts`.
    strapi.documents.use(async (context, next) => {
      if (context.uid === 'api::article.article' && context.action === 'findMany') {
        context.params.sort ??= 'title';
      }

      return next();
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // A database lifecycle subscriber: `event` is typed by `subscribe`.
    strapi.db.lifecycles.subscribe({
      models: ['api::article.article'],
      afterCreate(event) {
        strapi.log.debug(`Created ${event.model.uid}`);
      },
    });
  },
};
