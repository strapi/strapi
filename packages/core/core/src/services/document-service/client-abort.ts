import type { Core } from '@strapi/types';

import { isAbortReadsOnRequestDisconnectEnabled } from '../server/client-abort';
import type { Middleware } from './middlewares/middleware-manager';

const WRITE_ACTIONS = new Set([
  'create',
  'update',
  'delete',
  'clone',
  'publish',
  'unpublish',
  'discardDraft',
]);

/**
 * A document write runs to completion even when the client that requested it disconnected
 * (`database.settings.abortReadsOnRequestDisconnect`). Middlewares read outside the write's
 * transaction, before it (e.g. review workflows) and after it commits (e.g. content history), so
 * this middleware is registered first: the rest of the chain, other middlewares included, runs
 * detached from the request's abort signal. While the setting is off it only calls `next`.
 */
export const createDetachWritesMiddleware =
  (strapi: Core.Strapi): Middleware =>
  (ctx, next) => {
    if (!WRITE_ACTIONS.has(ctx.action) || !isAbortReadsOnRequestDisconnectEnabled(strapi)) {
      return next();
    }

    return strapi.db.runWithoutAbortSignal(() => next());
  };
