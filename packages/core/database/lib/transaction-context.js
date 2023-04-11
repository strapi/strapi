'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const transactionCtx = {
  async run(store, cb) {
    return storage.run(store, cb);
  },

  get() {
    const trx = storage.getStore();
    return trx?.isCompleted() ? undefined : trx;
  },
};

module.exports = transactionCtx;
