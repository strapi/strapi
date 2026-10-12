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

/**
 * One connection per transaction. Postgres and MySQL reject overlapping
 * queries on that connection, and the pool then fills with acquires that
 * never settle. Chain SQL for a transaction so parallel callers (populate,
 * counts) still share it safely. The queued task must not start another
 * exclusive query before it finishes, or the chain deadlocks.
 */
const transactionQueues = new WeakMap<Knex.Transaction, Promise<unknown>>();

const runExclusive = <T>(
  trx: Knex.Transaction | null | undefined,
  task: () => Promise<T>
): Promise<T> => {
  if (!trx) {
    return task();
  }

  // Register before awaiting so two callers in the same tick cannot both pass.
  const previous = transactionQueues.get(trx) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => task());
  transactionQueues.set(trx, run);

  return run as Promise<T>;
};

/**
 * Commit hooks do database work after the transaction finishes (document
 * events, history, audit logs). Waiting for them keeps that work on the
 * caller's timeline so a later destroy does not abort it mid-query.
 * Callbacks may register more hooks; drain until none remain.
 */
const runCallbacks = async (callbacks: Callback[] | undefined) => {
  if (!callbacks) {
    return;
  }

  while (callbacks.length > 0) {
    const batch = callbacks.splice(0, callbacks.length);
    await Promise.all(batch.map((cb) => Promise.resolve(cb())));
  }
};

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

    await runCallbacks(store?.commitCallbacks);
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

    await runCallbacks(store?.rollbackCallbacks);
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

  runExclusive,
};

export { transactionCtx };
