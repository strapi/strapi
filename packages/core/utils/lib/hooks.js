'use strict';

/**
 * @typedef {import('@strapi/strapi').Hook} Hook
 */

const { eq, remove, cloneDeep } = require('lodash/fp');

/**
 * Create a default Strapi hook
 * @returns {Hook}
 */
const createHook = () => {
  const state = {
    handlers: [],
  };

  return {
    get handlers() {
      return state.handlers;
    },

    register(handler) {
      state.handlers.push(handler);
      return this;
    },

    delete(handler) {
      state.handlers = remove(eq(handler), state.handlers);
      return this;
    },

    call() {
      throw new Error('Method not implemented');
    },
  };
};

/**
 * Create an async series hook.
 * Upon execution, it will execute every handler in order with the same context
 * @returns {Hook}
 */
const createAsyncSeriesHook = () => ({
  ...createHook(),

  async call(context) {
    for (const handler of this.handlers) {
      await handler(context);
    }
  },
});

/**
 * Create an async series waterfall hook.
 * Upon execution, it will execute every handler in order and pass the return value of the last handler to the next one
 * @returns {Hook}
 */
const createAsyncSeriesWaterfallHook = () => ({
  ...createHook(),

  async call(param) {
    let res = param;

    for (const handler of this.handlers) {
      res = await handler(res);
    }

    return res;
  },
});

/**
 * Create an async parallel hook.
 * Upon execution, it will execute every registered handler in band.
 * @returns {Hook}
 */
const createAsyncParallelHook = () => ({
  ...createHook(),

  async call(context) {
    const promises = this.handlers.map(handler => handler(cloneDeep(context)));

    return Promise.all(promises);
  },
});

module.exports = {
  // Internal utils
  internals: {
    createHook,
  },
  // Hooks
  createAsyncSeriesHook,
  createAsyncSeriesWaterfallHook,
  createAsyncParallelHook,
};
