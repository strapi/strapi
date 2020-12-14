'use strict';

module.exports = async () => {
  // Initialize the Sentry service exposed by this plugin
  const { sentry } = strapi.plugins.sentry.services;
  sentry.init();

  // Create a middleware to intercept API errors
  strapi.app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      sentry.sendError(error, (scope, sentryInstance) => {
        scope.addEventProcessor(event => {
          // Parse Koa context to add error metadata
          return sentryInstance.Handlers.parseRequest(event, ctx.request);
        });
        // Manually add Strapi version
        scope.setTag('strapi_version', strapi.config.info.strapi);
      });
      throw error;
    }
  });
};
