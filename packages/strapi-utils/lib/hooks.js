'use strict';

const { eq, remove, cloneDeep } = require('lodash/fp');

/**
 * A store containing a list of handler that will be executed in a specific manner upon activation
 * @typedef Hook
 * @property {function(function(object))} register - Adds a new handler that will be execute upon hook's call
 * @property {function(object): Promise} call - Triggers the hook, call every handler in a specific manner following its implementation
 */

/**
 * Create a handler registry and returns its associated helper functions
 */
const createHandlerRegistry = () => {
  const state = {
    registry: [],
  };

  /**
   * Get a copy of the registry values
   * @return {function[]}
   */
  const get = () => Array.from(state.registry);

  /**
   * Add a new handler to the registry
   * @param {function} handler
   */
  const register = handler => {
    state.registry.push(handler);
  };

  /**
   * Delete a handler from the registry
   * It performs an equality check on each registered handler
   * @param {function} handler
   */
  const del = handler => {
    state.registry = remove(eq(handler), state.registry);
  };

  return { get, register, del };
};

/**
 * A generic {@link Hook} factory with customizable {@link Hook.call} action
 * @param {function(object): function} createCallStrategy
 * @return {Hook}
 */
const hookFactory = createCallStrategy => {
  const registry = createHandlerRegistry();
  const callStrategy = createCallStrategy(registry);

  return {
    register(handler) {
      registry.register(handler);
      return this;
    },

    call: callStrategy,
  };
};

/**
 * Create an async series hook.
 * Upon execution, it will execute every handler in order with the same context
 * @return {Hook}
 */
const createAsyncSeriesHook = () =>
  hookFactory(({ get }) => async context => {
    const handlers = get();

    for (const handler of handlers) {
      await handler(context);
    }
  });

/**
 * Create an async series waterfall hook.
 * Upon execution, it will execute every handler in order and pass the return value of the last handler to the next one
 * @return {Hook}
 */
const createAsyncSeriesWaterfallHook = () =>
  hookFactory(({ get }) => async param => {
    const handlers = get();
    let res = param;

    for (const handler of handlers) {
      res = await handler(res);
    }

    return res;
  });

/**
 * Create an async parallel hook.
 * Upon execution, it will execute every registered handler in band.
 * @return {Hook}
 */
const createAsyncParallelHook = () =>
  hookFactory(({ get }) => context => {
    const handlers = get();
    const promises = handlers.map(handler => handler(cloneDeep(context)));

    return Promise.all(promises);
  });

module.exports = {
  // Internal utils
  internals: {
    hookFactory,
    createHandlerRegistry,
  },
  // Hooks
  createAsyncSeriesHook,
  createAsyncSeriesWaterfallHook,
  createAsyncParallelHook,
};
