'use strict';

const { eq, remove, cloneDeep } = require('lodash/fp');

/**
 * @typedef Hook
 * @property {Array<Function>} _handlers - A registry of handler used by the hook
 * @property {function(Function):Hook} register - Register a new handler into the hook's registry
 * @property {function(Function):Hook} delete- Delete the given handler from the hook's registry
 * @property {Function} call - Not implemented by default, can be replaced by any implementation.
 */

/**
 * Create a default Strapi hook
 * @return {Hook}
 */
const createHook = () => ({
  _handlers: [],

  register(handler) {
    this._handlers.push(handler);
    return this;
  },

  delete(handler) {
    this._handlers = remove(eq(handler), this._handlers);
    return this;
  },

  call() {
    throw new Error('Method not implemented');
  },
});

/**
 * Create an async series hook.
 * Upon execution, it will execute every handler in order with the same context
 * @return {Hook}
 */
const createAsyncSeriesHook = () => ({
  ...createHook(),

  async call(context) {
    for (const handler of this._handlers) {
      await handler(context);
    }
  },
});

/**
 * Create an async series waterfall hook.
 * Upon execution, it will execute every handler in order and pass the return value of the last handler to the next one
 * @return {Hook}
 */
const createAsyncSeriesWaterfallHook = () => ({
  ...createHook(),

  async call(param) {
    let res = param;

    for (const handler of this._handlers) {
      res = await handler(res);
    }

    return res;
  },
});

/**
 * Create an async parallel hook.
 * Upon execution, it will execute every registered handler in band.
 * @return {Hook}
 */
const createAsyncParallelHook = () => ({
  ...createHook(),

  call(context) {
    const promises = this._handlers.map(handler => handler(cloneDeep(context)));

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
