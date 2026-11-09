import { AsyncLocalStorage } from 'node:async_hooks';
import { Knex } from 'knex';

import { SavepointError } from './errors';

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

/**
 * Releases (`commit`) or rolls back to (`rollback`) a savepoint, returning what the database
 * rejected it with. Knex resolves the savepoint's `commit()`/`rollback()` even when the database
 * rejects `RELEASE SAVEPOINT`/`ROLLBACK TO SAVEPOINT`: only its `executionPromise` rejects (with
 * nothing, if the rollback timed out). On MySQL it doesn't even do that for a savepoint that no
 * longer exists (`ER_SP_DOES_NOT_EXIST`, e.g. after a deadlock rolled back the whole
 * transaction): its transaction class takes it for an implicit commit by DDL, only logs a warning,
 * and resolves. The error is still emitted as the transactor's `query-error`, so it's read there.
 */
const endSavepoint = async (
  trx: Knex.Transaction,
  end: 'commit' | 'rollback'
): Promise<unknown> => {
  let queryError: unknown = null;
  const onQueryError = (error: unknown) => {
    queryError = error;
  };

  trx.on('query-error', onQueryError);
  try {
    await trx[end]();
    await trx.executionPromise;
    return queryError;
  } catch (error) {
    return error ?? new Error(`The savepoint ${end} timed out`);
  } finally {
    trx.off('query-error', onQueryError);
  }
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

interface CallbackRunOptions {
  report?: (error: unknown) => void;
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

const runCallbacks = async (callbacks: Callback[], options?: CallbackRunOptions) => {
  // Hooks can register more hooks while they run.
  while (callbacks.length > 0) {
    const batch = callbacks.splice(0, callbacks.length);
    await Promise.allSettled(
      batch.map(async (cb) => {
        try {
          await cb();
        } catch (error) {
          options?.report?.(error);
        }
      })
    );
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
  run<TCallback extends Callback>(
    trx: Knex.Transaction,
    cb: TCallback,
    owner: object = defaultHookOwner
  ) {
    const store = storage.getStore();
    // Share callback arrays only while the parent transaction is still open.
    // Commit hooks run after that transaction is cleared. A transaction they
    // open must not keep the parent's arrays, or its own onCommit callbacks
    // run with the parent's instead of after its own commit.
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

  /**
   * Runs `cb` in a savepoint of the current transaction, with its own commit and rollback
   * callbacks. Once `cb` resolves, the savepoint is released and its callbacks wait for the
   * outer transaction. If `cb` throws, only its writes are rolled back, its commit callbacks
   * are dropped, its rollback callbacks run, and the error is rethrown. If the database rejects
   * the release or the rollback (e.g. MySQL already rolled back the whole transaction), it throws
   * a `SavepointError`, after running the rollback callbacks: the transaction must fail with it.
   */
  async savepoint<T>(cb: () => Promise<T> | T): Promise<T> {
    const parent = storage.getStore();
    if (!parent?.trx) {
      throw new Error('A savepoint can only be created inside a transaction');
    }

    // Knex runs a transaction started from a transaction as a savepoint
    const trx = await parent.trx.transaction();
    const store: Store = { trx, commitCallbacks: [], rollbackCallbacks: [] };

    let result: T;
    try {
      result = await storage.run(store, cb);
    } catch (error) {
      const rollbackError = await endSavepoint(trx, 'rollback');
      store.rollbackCallbacks.forEach((callback) => callback());
      throw rollbackError
        ? new SavepointError('Failed to roll back to the savepoint', {
            cause: rollbackError,
            error,
          })
        : error;
    }

    const releaseError = await endSavepoint(trx, 'commit');
    if (releaseError) {
      store.rollbackCallbacks.forEach((callback) => callback());
      throw new SavepointError('Failed to release the savepoint', { cause: releaseError });
    }
    parent.commitCallbacks.push(...store.commitCallbacks);
    parent.rollbackCallbacks.push(...store.rollbackCallbacks);

    return result;
  },
};

export { HOOK_DRAIN_TIMEOUT_MS, transactionCtx };
