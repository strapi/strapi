'use strict';

const { stripUrlQueryAndFragment } = require("@sentry/utils");

/**
 * Programmatic sentry-performance middleware. We do not want to expose it in the plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = ({ strapi }) => {
  const sentryService = strapi.plugin('sentry').service('sentry');
  sentryService.init();
  const Sentry = sentryService.getInstance();

  if (!Sentry || !sentryService.hasTracingEnabled()) {
    // initialization failed or tracing is not enabled
    return;
  }

  strapi.server.use(async (ctx, next) => {
    return new Promise((resolve, reject) => {
      Sentry.runWithAsyncContext(async () => {
        const hub = Sentry.getCurrentHub();
        hub.configureScope((scope) =>
          scope.addEventProcessor((event) =>
            Sentry.addRequestDataToEvent(event, ctx.request, {
              include: {
                user: false,
              },
            })
          )
        );

        try {
          await next();
        } catch (err) {
          reject(err);
        }
        resolve();
      });
    });
  });

  // this tracing middleware creates a transaction per request
  strapi.server.use(async (ctx, next) => {
    const reqMethod = (ctx.method || "").toUpperCase();
    const reqUrl = ctx.url && stripUrlQueryAndFragment(ctx.url);

    // connect to trace of upstream app
    let traceparentData;
    if (ctx.request.get("sentry-trace")) {
      traceparentData = Sentry.extractTraceparentData(
        ctx.request.get("sentry-trace")
      );
    }

    const transaction = Sentry.startTransaction({
      name: `${reqMethod} ${reqUrl}`,
      op: "http.server",
      ...traceparentData,
    });

    ctx.__sentry_transaction = transaction;

    // We put the transaction on the scope so users can attach children to it
    Sentry.getCurrentHub().configureScope((scope) => {
      scope.setSpan(transaction);
    });

    ctx.res.on("finish", () => {
      // Push `transaction.finish` to the next event loop so open spans have a chance to finish before the transaction closes
      setImmediate(() => {
        // if using koa router, a nicer way to capture transaction using the matched route
        if (ctx._matchedRoute) {
          const mountPath = ctx.mountPath || "";
          transaction.setName(`${reqMethod} ${mountPath}${ctx._matchedRoute}`);
        }
        transaction.setHttpStatus(ctx.status);
        transaction.finish();
      });
    });

    await next();
  });
};
