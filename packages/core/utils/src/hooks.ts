import { eq, remove, cloneDeep } from 'lodash/fp';

export type Handler = (...args: any[]) => any;

export interface Hook<T extends Handler = Handler> {
  getHandlers(): Handler[];
  register(handler: T): Hook<T>;
  delete(handler: T): Hook<T>;
  call(...args: any[]): void;
}

export interface AsyncSeriesHook extends Hook {
  call(...args: any[]): Promise<void>;
}
export interface AsyncSeriesWaterfallHook extends Hook {
  call(...args: any[]): Promise<any>;
}

export interface AsyncParallelHook extends Hook {
  call(...args: any[]): Promise<any[]>;
}

export interface AsyncBailHook extends Hook {
  call(...args: any[]): Promise<any>;
}

/**
 * Create a default Strapi hook
 */
const createHook = <T extends Handler = Handler>(): Hook<T> => {
  type State = {
    handlers: T[];
  };

  const state: State = {
    handlers: [],
  };

  return {
    getHandlers() {
      return state.handlers;
    },

    register(handler: T) {
      state.handlers.push(handler);

      return this;
    },

    delete(handler: T) {
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
const createAsyncSeriesHook = <T extends Handler = Handler>() => ({
  ...createHook<T>(),

  async call(context: unknown) {
    for (const handler of this.getHandlers()) {
      await handler(context);
    }
  },
});

/**
 * Create an async series waterfall hook.
 * Upon execution, it will execute every handler in order and pass the return value of the last handler to the next one
 */
const createAsyncSeriesWaterfallHook = <T extends Handler = Handler>() => ({
  ...createHook<T>(),

  async call(param: unknown) {
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
const createAsyncParallelHook = <T extends Handler = Handler>() => ({
  ...createHook<T>(),

  async call(context: unknown) {
    const promises = this.getHandlers().map((handler) => handler(cloneDeep(context)));

    return Promise.all(promises);
  },
});

/**
 * Create an async parallel hook.
 * Upon execution, it will execute every registered handler in serie and return the first result found.
 */
const createAsyncBailHook = <T extends Handler = Handler>() => ({
  ...createHook<T>(),

  async call(context: unknown) {
    for (const handler of this.getHandlers()) {
      const result = await handler(context);

      if (result !== undefined) {
        return result;
      }
    }
  },
});

export const internals = {
  // Internal utils
  createHook,
};

export {
  createAsyncSeriesHook,
  createAsyncSeriesWaterfallHook,
  createAsyncParallelHook,
  createAsyncBailHook,
};
