'use strict';

const {
  tracingContextFromHeaders,
  isString,
  extractPathForTransaction,
  extractRequestData,
} = require('@sentry/utils');

/**
 * Programmatic sentry-performance middleware. We do not want to expose it in the plugin
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

  strapi.server.use((ctx, next) => {
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

      next();
    });
  });

  // this tracing middleware creates a transaction per request
  strapi.server.use((ctx, next) => {
    const req = ctx.request;

    const hub = Sentry.getCurrentHub();
    const reqMethod = (ctx.method || '').toUpperCase();

    if (reqMethod === 'OPTIONS' || reqMethod === 'HEAD') {
      return next();
    }

    const sentryTrace =
      req.headers && isString(req.headers['sentry-trace'])
        ? req.headers['sentry-trace']
        : undefined;
    const baggage = req.headers?.baggage;
    const { traceparentData, dynamicSamplingContext, propagationContext } =
      tracingContextFromHeaders(sentryTrace, baggage);
    hub.getScope().setPropagationContext(propagationContext);

    if (!sentryService.hasTracingEnabled()) {
      return next();
    }

    const [name, source] = extractPathForTransaction(req, { path: true, method: true });
    const transaction = Sentry.startTransaction(
      {
        name,
        op: 'http.server',
        ...traceparentData,
        metadata: {
          dynamicSamplingContext:
            traceparentData && !dynamicSamplingContext ? {} : dynamicSamplingContext,
          // The request should already have been stored in `scope.sdkProcessingMetadata` (which will become
          // `event.sdkProcessingMetadata` the same way the metadata here will) by `sentryRequestMiddleware`, but on the
          // off chance someone is using `sentryTracingMiddleware` without `sentryRequestMiddleware`, it doesn't hurt to
          // be sure
          request: req,
          source,
        },
      },
      // extra context passed to the tracesSampler
      { request: extractRequestData(req) }
    );

    // We put the transaction on the scope so users can attach children to it
    hub.configureScope((scope) => {
      scope.setSpan(transaction);
    });

    // We also set __sentry_transaction on the response so people can grab the transaction there to add
    // spans to it later.
    ctx.res.__sentry_transaction = transaction;

    ctx.res.on('finish', () => {
      // Push `transaction.finish` to the next event loop so open spans have a chance to finish before the transaction closes
      setImmediate(() => {
        // if using koa router, a nicer way to capture transaction using the matched route
        if (ctx._matchedRoute) {
          const mountPath = ctx.mountPath || '';
          transaction.setName(`${reqMethod} ${mountPath}${ctx._matchedRoute}`);
        }
        transaction.setHttpStatus(ctx.status);
        transaction.finish();
      });
    });

    next();
  });
};
