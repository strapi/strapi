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

const transactionCtx = {
  async run<TCallback extends Callback>(trx: Knex.Transaction, cb: TCallback) {
    const store = storage.getStore();
    return storage.run<ReturnType<TCallback>, void[]>(
      {
        trx,
        // Fill with existing callbacks if nesting transactions
        commitCallbacks: store?.commitCallbacks || [],
        rollbackCallbacks: store?.rollbackCallbacks || [],
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

    if (!store?.commitCallbacks.length) {
      return;
    }

    // Run callbacks
    store.commitCallbacks.forEach((cb) => cb());
    store.commitCallbacks = [];
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

    if (!store?.rollbackCallbacks.length) {
      return;
    }

    // Run callbacks
    store.rollbackCallbacks.forEach((cb) => cb());
    store.rollbackCallbacks = [];
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

export { isDeadlockError, transactionCtx, waitForDeadlockRetry };
