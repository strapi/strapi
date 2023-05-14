'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const transactionCtx = {
  async run(store, cb) {
    return storage.run({ trx: store }, cb);
  },

  get() {
    const store = storage.getStore();
    return store?.trx;
  },

  clear() {
    const store = storage.getStore();
    if (store?.trx) {
      store.trx = null;
    }
  },
};

module.exports = transactionCtx;
