import { AsyncLocalStorage } from 'node:async_hooks';

interface AbortStore {
  signal: AbortSignal;
  /** Set once the unit of work has written: from then on, none of its queries are aborted. */
  written: boolean;
}

const storage = new AsyncLocalStorage<AbortStore>();

/**
 * Carries the `AbortSignal` of the unit of work (in practice, the HTTP request) that is running,
 * so the query builder can stop issuing reads for work nobody is waiting on anymore.
 * Mirrors `transactionCtx`: the signal follows the async flow started inside `run`.
 *
 * The store is shared by the whole flow, so once any part of it writes, the rest of the flow
 * (including reads that decide or follow up on that write) runs to completion.
 */
const abortCtx = {
  run<T>(signal: AbortSignal, cb: () => T): T {
    return storage.run({ signal, written: false }, cb);
  },

  /** Runs `cb` detached from any abort signal, e.g. work that must outlive the request. */
  exit<T>(cb: () => T): T {
    return storage.exit(cb);
  },

  /** Records that the running unit of work wrote, so none of its later queries are aborted. */
  markWritten() {
    const store = storage.getStore();
    if (store) {
      store.written = true;
    }
  },

  /** Marks the unit of work as written, then runs `cb` detached from its abort signal. */
  detachWrite<T>(cb: () => T): T {
    abortCtx.markWritten();
    return storage.exit(cb);
  },

  /** The signal of the running unit of work, or undefined once it has written. */
  get(): AbortSignal | undefined {
    const store = storage.getStore();
    return store && !store.written ? store.signal : undefined;
  },
};

export { abortCtx };
