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

interface TransactionStore extends Store {
  // Retain ownership through a failed commit so its rollback can still find the hooks.
  owner: Knex.Transaction | null;
  phase: 'active' | 'finalizing' | 'closed';
}

const storage = new AsyncLocalStorage<TransactionStore>();

const getActiveStore = () => {
  const store = storage.getStore();
  if (store && store.phase !== 'active') {
    throw new Error(`Transaction is ${store.phase}; new work is not allowed.`);
  }
  return store;
};

const getTransactionStore = (trx: Knex.Transaction) => {
  const store = storage.getStore();
  return store?.owner === trx ? store : undefined;
};

const closeStore = (store: TransactionStore | undefined) => {
  if (store) {
    store.phase = 'closed';
    store.trx = null;
    store.owner = null;
    store.commitCallbacks = [];
    store.rollbackCallbacks = [];
  }
};

const finalize = async (trx: Knex.Transaction, event: 'commit' | 'rollback') => {
  const store = getTransactionStore(trx);
  if (isTransactorComplete(trx)) {
    closeStore(store);
    return;
  }

  // Descendants must not join a dying transaction or silently start an independent one.
  if (store) {
    store.phase = 'finalizing';
  }

  try {
    await trx[event]();
  } catch (error) {
    if (store) {
      store.phase = 'closed';
      store.trx = null;
    }
    // A rejected commit still needs its owner and hooks for the wrapper's rollback path.
    // A rejected rollback is terminal: do not retain the transactor or either hook list.
    if (event === 'rollback') {
      closeStore(store);
    }
    throw error;
  }

  const callbacks = store?.[event === 'commit' ? 'commitCallbacks' : 'rollbackCallbacks'] ?? [];
  closeStore(store);

  // Only completion hooks get a clean context. Already-created descendants keep the closed
  // store, while recovery work (including async hook continuations) starts outside it.
  storage.exit(() => callbacks.forEach((cb) => cb()));
};

const transactionCtx = {
  async run<TCallback extends Callback>(trx: Knex.Transaction, cb: TCallback) {
    const parentStore = getActiveStore();
    const store: TransactionStore =
      parentStore?.trx === trx
        ? parentStore
        : { owner: trx, trx, phase: 'active', commitCallbacks: [], rollbackCallbacks: [] };

    return storage.run<ReturnType<TCallback>, void[]>(store, cb);
  },

  get() {
    return getActiveStore()?.trx;
  },

  async commit(trx: Knex.Transaction) {
    await finalize(trx, 'commit');
  },

  async rollback(trx: Knex.Transaction) {
    await finalize(trx, 'rollback');
  },

  onCommit(cb: Callback) {
    getActiveStore()?.commitCallbacks.push(cb);
  },

  onRollback(cb: Callback) {
    getActiveStore()?.rollbackCallbacks.push(cb);
  },
};

export { transactionCtx };
