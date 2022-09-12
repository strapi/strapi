'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const transactionCtx = {
  async run(store, cb) {
    return storage.run(store, cb);
  },

  get() {
    return storage.getStore();
  },
};

module.exports = transactionCtx;
