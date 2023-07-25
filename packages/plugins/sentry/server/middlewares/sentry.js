'use strict';

/**
 * Programmatic sentry middleware. We do not want to expose it in the plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = ({ strapi }) => {
  const sentryService = strapi.plugin('sentry').service('sentry');
  sentryService.init();
  const Sentry = sentryService.getInstance();

  if (!Sentry) {
    // initialization failed
    return;
  }

  strapi.server.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      sentryService.sendError(error, (scope, Sentry) => {
        scope.setSDKProcessingMetadata({ request: ctx.request });
        Sentry.captureException(error);

        // Manually add Strapi version
        scope.setTag('strapi_version', strapi.config.info.strapi);

        // TODO Remove these, let this be handled by Sentry
        scope.setTag('transaction', `${ctx.method} ${ctx._matchedRoute}`);
        scope.setTag('method', ctx.method);
      });

      throw error;
    }
  });
};
