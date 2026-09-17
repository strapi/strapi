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

// Keep ownership after clearing the active transactor: a failed commit still needs rollback hooks.
interface TransactionStore extends Store {
  readonly owner: Knex.Transaction;
}

const storage = new AsyncLocalStorage<TransactionStore>();

const getTransactionStore = (trx: Knex.Transaction) => {
  const store = storage.getStore();
  return store?.owner === trx ? store : undefined;
};

const transactionCtx = {
  async run<TCallback extends Callback>(trx: Knex.Transaction, cb: TCallback) {
    // Only scopes of the same transaction share its lifecycle and callbacks. A transaction
    // started from a completion hook must not inherit hooks from the finalized transaction.
    const parentStore = storage.getStore();
    const store =
      parentStore?.trx === trx
        ? parentStore
        : { owner: trx, trx, commitCallbacks: [], rollbackCallbacks: [] };

    return storage.run<ReturnType<TCallback>, void[]>(store, cb);
  },

  get() {
    const store = storage.getStore();
    return store?.trx;
  },

  async commit(trx: Knex.Transaction) {
    const store = getTransactionStore(trx);
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
    const store = getTransactionStore(trx);
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

export { transactionCtx };
