import type { Core, Modules } from '@strapi/types';

const WRITE_ACTIONS = [
  'create',
  'update',
  'delete',
  'clone',
  'publish',
  'unpublish',
  'discardDraft',
] as const;

/**
 * A document write runs to completion even when the client that requested it disconnected
 * (`database.settings.cancelQueriesOnClientDisconnect`). Middlewares read outside the write's
 * transaction, before it (e.g. review workflows) and after it commits (e.g. content history), so the
 * whole action, middlewares included, runs detached from the request's abort signal.
 */
export const detachWritesFromClientAbort = (
  strapi: Core.Strapi,
  instance: Modules.Documents.ServiceInstance
): Modules.Documents.ServiceInstance => {
  for (const action of WRITE_ACTIONS) {
    const method = instance[action] as ((...args: unknown[]) => unknown) | undefined;

    if (typeof method === 'function') {
      Object.assign(instance, {
        [action]: (...args: unknown[]) =>
          typeof strapi.db?.runWithoutAbortSignal === 'function'
            ? strapi.db.runWithoutAbortSignal(() => method(...args))
            : method(...args),
      });
    }
  }

  return instance;
};
