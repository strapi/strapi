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

export interface Store {
  trx: Knex.Transaction | null;
  commitCallbacks: Callback[];
  rollbackCallbacks: Callback[];
  /** Database that opened the transaction. Its `destroy()` waits for these hooks. */
  owner: object;
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
 * Errors thrown after the handler had already committed or rolled back.
 * Replaying that attempt would repeat work the database has kept.
 */
const finalisedTransactionErrors = new WeakSet<object>();

const isFinalisedTransactionError = (error: unknown) =>
  !!error && typeof error === 'object' && finalisedTransactionErrors.has(error);

const recordErrorIfTransactorFinalised = (trx: Knex.Transaction, error: unknown) => {
  if (!isTransactorComplete(trx) || !error || typeof error !== 'object') {
    return;
  }

  finalisedTransactionErrors.add(error);
};

interface CallbackRunOptions {
  report?: (error: unknown) => void;
  /** Report the error, skip the remaining callbacks, and do not reject the caller. */
  stopOnError?: boolean;
}

/**
 * How long `Database.destroy` waits for commit and rollback hooks. A hook
 * still running after this stays running, and the pool closes. There is no
 * setting for it: a stuck hook must not hold process exit.
 */
const HOOK_DRAIN_TIMEOUT_MS = 10_000;

/**
 * Hooks scheduled by `run` when the caller does not pass a database.
 * Tests that call `transactionCtx` directly use this owner.
 */
const defaultHookOwner = {};

/**
 * Hooks started by commit and rollback, per database. `strapi.db.transaction`
 * does not wait for them. That database's `destroy` does, before its pool closes.
 */
const pendingHooks = new WeakMap<object, Set<Promise<void>>>();

const hooksFor = (owner: object) => {
  let pending = pendingHooks.get(owner);
  if (!pending) {
    pending = new Set();
    pendingHooks.set(owner, pending);
  }

  return pending;
};

const runCallbacks = async (callbacks: Callback[] | undefined, options?: CallbackRunOptions) => {
  if (!callbacks) {
    return;
  }

  // Hooks can register more hooks while they run.
  while (callbacks.length > 0) {
    const batch = callbacks.splice(0, callbacks.length);
    for (const cb of batch) {
      try {
        await cb();
      } catch (error) {
        options?.report?.(error);
        // A commit hook runs after the database has kept the write. Log it
        // and keep going so one failure does not drop the hooks after it.
        // A rollback hook stops. The rest would observe a rolled-back write.
        if (options?.stopOnError || !options?.report) {
          callbacks.length = 0;
          return;
        }
      }
    }
  }
};

const scheduleCallbacks = (callbacks: Callback[] | undefined, options?: CallbackRunOptions) => {
  if (!callbacks?.length) {
    return;
  }

  const owner = storage.getStore()?.owner ?? defaultHookOwner;
  const pending = hooksFor(owner);
  const tracked = runCallbacks(callbacks, options).finally(() => {
    pending.delete(tracked);
  });
  pending.add(tracked);
};

const settleHooks = async (owner: object = defaultHookOwner, timeoutMs = HOOK_DRAIN_TIMEOUT_MS) => {
  const pending = pendingHooks.get(owner);
  if (!pending || pending.size === 0) {
    return true;
  }

  // A hook can open a transaction, which schedules more hooks on this database.
  const deadline = Date.now() + timeoutMs;
  while (pending.size > 0) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return false;
    }

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        resolve();
      }, remaining);
    });

    await Promise.race([Promise.all(pending), timeout]);
    clearTimeout(timeoutId);
    if (timedOut) {
      return false;
    }
  }

  return true;
};

const transactionCtx = {
  async run<TCallback extends Callback>(
    trx: Knex.Transaction,
    cb: TCallback,
    owner: object = defaultHookOwner
  ) {
    const store = storage.getStore();
    // Share callback arrays only while the parent transaction is still open.
    // Commit hooks run after that transaction is cleared. A transaction they
    // open must not keep the parent's arrays, or a rolled-back attempt's
    // onCommit callbacks run beside the successful attempt.
    const parent = store?.trx ? store : undefined;
    return storage.run<ReturnType<TCallback>, void[]>(
      {
        trx,
        owner,
        commitCallbacks: parent ? parent.commitCallbacks : [],
        rollbackCallbacks: parent ? parent.rollbackCallbacks : [],
      },
      cb
    );
  },

  get() {
    const store = storage.getStore();
    return store?.trx;
  },

  async commit(trx: Knex.Transaction, reportCommitHookError?: (error: unknown) => void) {
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

    scheduleCallbacks(store?.commitCallbacks, {
      report: reportCommitHookError ?? (() => undefined),
    });
  },

  async rollback(trx: Knex.Transaction, reportRollbackHookError?: (error: unknown) => void) {
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

    scheduleCallbacks(store?.rollbackCallbacks, {
      report: reportRollbackHookError,
      stopOnError: true,
    });
  },

  /**
   * Wait for commit and rollback hooks of one database, including hooks those
   * hooks start. Returns false when hooks are still running at the deadline.
   * `Database.destroy` calls this before closing that database's pool.
   */
  settleHooks,

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

export {
  HOOK_DRAIN_TIMEOUT_MS,
  isDeadlockError,
  isFinalisedTransactionError,
  recordErrorIfTransactorFinalised,
  transactionCtx,
  waitForDeadlockRetry,
};
