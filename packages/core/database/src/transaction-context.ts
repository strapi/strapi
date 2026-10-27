import { AsyncLocalStorage } from 'node:async_hooks';
import { Knex } from 'knex';

/**
 * After the user calls the Knex transactor’s `commit` or `rollback` (e.g. via
 * the callback object returned from `Database#transaction`, or after the
 * container’s promise has settled in Knex), a second finalisation is invalid
 * and can throw (e.g. "Transaction query already complete"). Knex exposes
 * `isCompleted()` for this; optional for mocks that omit it.
 */
const isTransactorComplete = (trx: Knex.Transaction) => {
  const t = trx as Knex.Transaction & { isCompleted?: () => boolean };
  return typeof t.isCompleted === 'function' && t.isCompleted();
};

export type Callback = (...args: any[]) => Promise<any> | any;

export interface TransactionObject {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  get: () => Knex.Transaction;
}
export interface CallbackLogger {
  error: (message: string) => void;
}

/**
 * One database instance owns this set. A process can boot several instances,
 * and one shutdown must not wait on another's commit hooks.
 */
export interface CallbackTracker {
  pending: Set<Promise<unknown>>;
  logger?: CallbackLogger;
}

export interface Store {
  trx: Knex.Transaction | null;
  commitCallbacks: Callback[];
  rollbackCallbacks: Callback[];
  tracker?: CallbackTracker;
}

const storage = new AsyncLocalStorage<Store>();

const isDeadlockError = (error: unknown) => {
  const seen = new Set<unknown>();

  const matches = (candidate: unknown): boolean => {
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) {
      return false;
    }

    seen.add(candidate);
    const current = candidate as {
      code?: string;
      errno?: number;
      message?: string;
      original?: unknown;
      cause?: unknown;
    };

    if (current.code === '40P01' || current.code === 'ER_LOCK_DEADLOCK' || current.errno === 1213) {
      return true;
    }

    // A driver error often keeps the SQL text after the code is stripped.
    // A plain Error whose message happens to mention a deadlock is not one.
    const message = current.message ?? '';
    const driverError = 'sql' in current || 'sqlState' in current || 'sqlMessage' in current;
    if (
      driverError &&
      (message.includes('deadlock detected') || message.includes('Deadlock found'))
    ) {
      return true;
    }

    return matches(current.original) || matches(current.cause);
  };

  return matches(error);
};

/** Short pause so two retried transactions do not collide again immediately. */
const DEADLOCK_RETRY_DELAY_MS = 25;

const waitForDeadlockRetry = (attempt: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, DEADLOCK_RETRY_DELAY_MS * attempt);
  });

/**
 * Commit and rollback hooks run after the transaction finishes, and the
 * caller does not wait for them. Hooks that return a promise (document
 * events, history, audit logs) keep using the database, so they are tracked
 * until they settle and Database#destroy can wait before closing the pool.
 * Hooks registered synchronously while a batch runs are included. A rejection
 * is logged and does not change the transaction result: the data is already
 * committed, and failing the request would invite a retry of that write.
 *
 * Shutdown stops waiting after this long. A hook that never settles (a hung
 * listener) must not block process exit.
 */
const CALLBACK_DRAIN_TIMEOUT_MS = 10_000;

const formatCallbackError = (error: unknown) => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
};

const reportCallbackError = (error: unknown, logger?: CallbackLogger) => {
  const message = `Transaction callback failed: ${formatCallbackError(error)}`;

  try {
    if (logger) {
      logger.error(message);
      return;
    }

    console.error(message);
  } catch {
    // A broken logger must not leave the hook in the pending set.
    try {
      console.error(message);
    } catch {
      // ignore
    }
  }
};

const track = (
  promise: Promise<unknown>,
  pending: Set<Promise<unknown>> | undefined,
  logger?: CallbackLogger
) => {
  const settled = promise.then(
    () => undefined,
    (error: unknown) => {
      reportCallbackError(error, logger);
    }
  );

  if (!pending) {
    return settled;
  }

  pending.add(settled);
  settled.then(
    () => {
      pending.delete(settled);
    },
    () => {
      pending.delete(settled);
    }
  );
  return settled;
};

const runCallbacks = (callbacks: Callback[] | undefined, tracker?: CallbackTracker) => {
  if (!callbacks) {
    return;
  }

  while (callbacks.length > 0) {
    const batch = callbacks.splice(0, callbacks.length);
    for (const cb of batch) {
      try {
        const result = cb();
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          track(result as Promise<unknown>, tracker?.pending, tracker?.logger);
        }
      } catch (error) {
        // The transaction is already committed. A synchronous throw must not
        // be retried as a deadlock.
        reportCallbackError(error, tracker?.logger);
      }
    }
  }
};

const waitForPendingCallbacks = async (
  pending: Set<Promise<unknown>>,
  options?: {
    timeoutMs?: number;
    onTimeout?: (pendingCount: number) => void;
  }
) => {
  const timeoutMs = options?.timeoutMs ?? CALLBACK_DRAIN_TIMEOUT_MS;

  if (pending.size === 0) {
    return;
  }

  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve();
    }, timeoutMs);
  });

  const drain = async () => {
    while (pending.size > 0 && !timedOut) {
      // Snapshot so hooks that register more hooks are picked up on the next pass.
      await Promise.allSettled(Array.from(pending));
    }
  };

  try {
    await Promise.race([drain(), timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }

  if (pending.size > 0) {
    options?.onTimeout?.(pending.size);
  }
};

const transactionCtx = {
  async run<TCallback extends Callback>(
    trx: Knex.Transaction,
    cb: TCallback,
    tracker?: CallbackTracker
  ) {
    const store = storage.getStore();
    return storage.run<ReturnType<TCallback>, void[]>(
      {
        trx,
        // Fill with existing callbacks if nesting transactions
        commitCallbacks: store?.commitCallbacks || [],
        rollbackCallbacks: store?.rollbackCallbacks || [],
        // Nested work commits with the outermost transaction, so it shares that tracker.
        tracker: store?.tracker ?? tracker,
      },
      cb
    );
  },

  get() {
    const store = storage.getStore();
    return store?.trx;
  },

  async commit(trx: Knex.Transaction) {
    const store = storage.getStore();
    if (isTransactorComplete(trx)) {
      if (store?.trx) {
        store.trx = null;
      }
      return;
    }

    // Clear transaction from store
    if (store?.trx) {
      store.trx = null;
    }

    // Commit transaction
    await trx.commit();

    runCallbacks(store?.commitCallbacks, store?.tracker);
  },

  async rollback(trx: Knex.Transaction) {
    const store = storage.getStore();
    if (isTransactorComplete(trx)) {
      if (store?.trx) {
        store.trx = null;
      }
      return;
    }

    // Clear transaction from store
    if (store?.trx) {
      store.trx = null;
    }

    // Rollback transaction
    await trx.rollback();

    runCallbacks(store?.rollbackCallbacks, store?.tracker);
  },

  onCommit(cb: Callback) {
    const store = storage.getStore();
    if (store?.commitCallbacks) {
      store.commitCallbacks.push(cb);
    }
  },

  onRollback(cb: Callback) {
    const store = storage.getStore();
    if (store?.rollbackCallbacks) {
      store.rollbackCallbacks.push(cb);
    }
  },
};

export { isDeadlockError, transactionCtx, waitForDeadlockRetry, waitForPendingCallbacks };
