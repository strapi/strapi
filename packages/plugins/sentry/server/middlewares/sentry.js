'use strict';

/**
 * Programmatic sentry middleware. We do not want to expose it in the plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = ({ strapi }) => {
  const sentry = strapi.plugin('sentry').service('sentry');
  sentry.init();

  strapi.server.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      sentry.sendError(error, (scope, sentryInstance) => {
        scope.addEventProcessor(event => {
          // Parse Koa context to add error metadata
          return sentryInstance.Handlers.parseRequest(event, ctx.request, {
            // Don't parse the transaction name, we'll do it manually
            transaction: false,
          });
        });

        // Manually add transaction name
        scope.setTag('transaction', `${ctx.method} ${ctx.request.url}`);
        // Manually add Strapi version
        scope.setTag('strapi_version', strapi.config.info.strapi);
        scope.setTag('method', ctx.method);
      });

      throw error;
    }
  });
};
