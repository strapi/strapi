'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Lightweight OSS-compatible audit logger for the example app.
    const writeAudit = async ({ action, result, meta, params }) => {
      try {
        const contentType = meta?.model || params?.model || params?.uid || 'unknown';
        const recordId = result?.id ?? (result && result._id) ?? null;
        const user = params?.context?.state?.user?.id ?? params?.context?.state?.user?._id ?? null;

        const payload = {
          contentType,
          recordId,
          result,
          params,
          meta,
        };

        await strapi.db.query('api::audit-log.audit-log').create({
          data: {
            action,
            date: new Date().toISOString(),
            payload,
            user: user || null,
          },
        });
      } catch (err) {
        strapi.log.error('Audit logger failed to write entry:', err.message || err);
      }
    };

    strapi.eventHub.on('entry.create', async (event) => {
      await writeAudit({ action: 'create', ...event });
    });

    strapi.eventHub.on('entry.update', async (event) => {
      await writeAudit({ action: 'update', ...event });
    });

    strapi.eventHub.on('entry.delete', async (event) => {
      await writeAudit({ action: 'delete', ...event });
    });

    strapi.log.info('OSS audit-log listener registered (examples/getstarted)');
  },

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
