import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    /**
     * Slow/error DB queries already log via database.performance.output (`log`|`both`).
     * Request summaries only hit the hub — mirror them to the console for local demos.
     */
    strapi.eventHub.subscribe(async (eventName, ...args) => {
      if (eventName !== 'performance.request.summary') {
        return;
      }

      const summary = args[0] as { dbQueryCount?: number; slowQueryCount?: number } | undefined;

      const slowCount = summary?.slowQueryCount ?? 0;

      // Quiet admin-shell traffic: summaries still exist on the hub; skip console noise.
      if (!summary || ((summary.dbQueryCount ?? 0) === 0 && slowCount === 0)) {
        return;
      }

      strapi.log.debug(`performance.request.summary ${JSON.stringify(summary)}`);
    });
  },
};
