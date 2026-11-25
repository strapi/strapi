import type { Core } from '@strapi/strapi';
import type * as Sentry from '@sentry/node';
import type createSentryService from '../services/sentry';

/**
 * A query the database refused or cancelled because the client left, with the setting that does so
 * on: not an error of the server. Matched by name: this package does not depend on
 * @strapi/database. With the setting off, or a client still connected, it is reported as usual.
 */
const isAbortedByClient = (
  error: Error,
  ctx: { res?: { destroyed?: boolean; writableEnded?: boolean } },
  strapi: Core.Strapi
) =>
  error.name === 'QueryAbortedError' &&
  strapi.db?.config?.settings?.abortReadsOnRequestDisconnect === true &&
  Boolean(ctx.res?.destroyed && !ctx.res.writableEnded);

/**
 * Programmatic sentry middleware. We do not want to expose it in the plugin
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const sentryService: ReturnType<typeof createSentryService> = strapi
    .plugin('sentry')
    .service('sentry');
  sentryService.init();
  const sentry = sentryService.getInstance();

  if (!sentry) {
    // initialization failed
    return;
  }

  strapi.server.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof Error && !isAbortedByClient(error, ctx, strapi)) {
        sentryService.sendError(error, (scope: Sentry.Scope) => {
          scope.addEventProcessor((event) => {
            // Parse Koa context to add error metadata
            return sentry.Handlers.parseRequest(event, ctx.request as Sentry.Request, {
              // Don't parse the transaction name, we'll do it manually
              transaction: false,
            });
          });

          // Manually add transaction name
          scope.setTag('transaction', `${ctx.method} ${ctx._matchedRoute}`);
          // Manually add Strapi version
          scope.setTag('strapi_version', strapi.config.get<string>('info.strapi'));
          scope.setTag('method', ctx.method);
        });
      }

      throw error;
    }
  });
};
