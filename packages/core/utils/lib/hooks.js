'use strict';

const { eq, remove, cloneDeep } = require('lodash/fp');

/**
 * Create a default Strapi hook
 */
const createHook = () => {
  const state = {
    handlers: [],
  };

  return {
    getHandlers() {
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
 */
const createAsyncSeriesHook = () => ({
  ...createHook(),

  async call(context) {
    for (const handler of this.getHandlers()) {
      await handler(context);
    }
  },
});

/**
 * Create an async series waterfall hook.
 * Upon execution, it will execute every handler in order and pass the return value of the last handler to the next one
 */
const createAsyncSeriesWaterfallHook = () => ({
  ...createHook(),

  async call(param) {
    let res = param;

    for (const handler of this.getHandlers()) {
      res = await handler(res);
    }

    return res;
  },
});

/**
 * Create an async parallel hook.
 * Upon execution, it will execute every registered handler in band.
 */
const createAsyncParallelHook = () => ({
  ...createHook(),

  async call(context) {
    const promises = this.getHandlers().map(handler => handler(cloneDeep(context)));

    return Promise.all(promises);
  },
});

/**
 * Create an async parallel hook.
 * Upon execution, it will execute every registered handler in serie and return the first result found.
 */
const createAsyncBailHook = () => ({
  ...createHook(),

  async call(context) {
    for (const handler of this.getHandlers()) {
      const result = await handler(context);

      if (result !== undefined) {
        return result;
      }
    }
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
  createAsyncBailHook,
};
