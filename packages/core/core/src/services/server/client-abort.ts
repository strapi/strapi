import type { Context } from 'koa';
import type { Core } from '@strapi/types';

/**
 * Aborts a per-request signal when the client disconnects before the response ended, and runs the
 * rest of the request with it as the database abort signal, so `select` queries stop being issued
 * (and a running one is cancelled) for a request nobody waits on. See the database docs.
 */
export const runWithClientAbortSignal = <T>(strapi: Core.Strapi, ctx: Context, run: () => T): T => {
  // The database can be unavailable (e.g. requests served before it is loaded)
  if (typeof strapi.db?.runWithAbortSignal !== 'function') {
    return run();
  }

  const controller = new AbortController();
  const onClose = () => {
    if (!ctx.res.writableEnded) {
      controller.abort();
    }
  };

  ctx.res.once('close', onClose);

  const cleanup = () => {
    ctx.res.removeListener('close', onClose);
  };

  try {
    const result = strapi.db.runWithAbortSignal(controller.signal, run);

    if (result instanceof Promise) {
      return result.finally(cleanup) as T;
    }

    cleanup();
    return result;
  } catch (error) {
    cleanup();
    throw error;
  }
};
