import { AsyncLocalStorage } from 'node:async_hooks';
import { Knex } from 'knex';

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
