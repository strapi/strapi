'use strict';

module.exports = {
  defaults: { sentry: { enabled: true } },
  load: {
    beforeInitialize() {
      strapi.config.middleware.load.after.unshift('sentry');
    },
    initialize() {
      const sentry = strapi.plugin('sentry').service('sentry');
      sentry.init();

      strapi.app.use(async (ctx, next) => {
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
    },
  },
};
