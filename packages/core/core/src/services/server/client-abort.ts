import type { Context } from 'koa';
import type { Core } from '@strapi/types';

// Methods that, by contract, only read. Everything else may write, so it is never armed.
const READ_ONLY_METHODS = new Set(['GET', 'HEAD']);

/**
 * Whether `database.settings.abortReadsOnRequestDisconnect` is on. While it is off, none of the
 * abort machinery runs (no signal, no detaching, no wrapping), so nothing changes for the app.
 *
 * @internal
 */
export const isAbortReadsOnRequestDisconnectEnabled = (strapi: Core.Strapi): boolean =>
  strapi.db?.config?.settings?.abortReadsOnRequestDisconnect === true;

/**
 * Whether the HTTP client left before the response ended.
 *
 * @internal
 */
export const isClientDisconnected = (ctx: Context): boolean => {
  const res = ctx.res as Partial<Context['res']> | undefined;

  return Boolean(res?.destroyed && !res.writableEnded);
};

/**
 * Runs `run` with a per-request abort signal that aborts when the client disconnects before the
 * response ended, as the database abort signal: `select` queries stop being issued (and a running
 * one is cancelled) for a request nobody waits on. See the database docs.
 *
 * Unlike {@link armReadOnlyRequestAbortSignal}, it does not look at the method: the caller must know
 * that the request only reads (e.g. a GraphQL query). Exposed as `strapi.server.armClientAbortSignal`.
 *
 * @internal
 */
export const armClientAbortSignal = <T>(strapi: Core.Strapi, ctx: Context, run: () => T): T => {
  // The database can be unavailable (e.g. requests served before it is loaded)
  if (typeof strapi.db?.runWithAbortSignal !== 'function') {
    return run();
  }

  // Nothing would consume the signal, so skip the controller and listener on every request
  if (!isAbortReadsOnRequestDisconnectEnabled(strapi)) {
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

/**
 * The app middleware's arming: only `GET` and `HEAD` requests get the signal, the rest can write
 * and run without one. A route that does write on a GET opts out with
 * `config.abortReadsOnRequestDisconnect: false`.
 */
export const armReadOnlyRequestAbortSignal = <T>(
  strapi: Core.Strapi,
  ctx: Context,
  run: () => T
): T => {
  if (!READ_ONLY_METHODS.has(ctx.method)) {
    return run();
  }

  return armClientAbortSignal(strapi, ctx, run);
};
