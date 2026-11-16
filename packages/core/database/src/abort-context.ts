import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<AbortSignal>();

/**
 * Carries the `AbortSignal` of the unit of work (in practice, the HTTP request) that is running,
 * so the query builder can stop issuing `select` queries for work nobody is waiting on anymore.
 * Mirrors `transactionCtx`: the signal follows the async flow started inside `run`.
 */
const abortCtx = {
  run<T>(signal: AbortSignal, cb: () => T): T {
    return storage.run(signal, cb);
  },

  /** Runs `cb` detached from any abort signal, e.g. work that must outlive the request. */
  exit<T>(cb: () => T): T {
    return storage.exit(cb);
  },

  get(): AbortSignal | undefined {
    return storage.getStore();
  },
};

export { abortCtx };
