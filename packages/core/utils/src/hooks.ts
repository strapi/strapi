import { cloneDeep } from 'lodash';

export type Handler = (...args: any[]) => any;

/**
 * The context a hook passes to each handler of type `T`: the handler's first parameter. `unknown`
 * when that parameter is `any`, as for the default {@link Handler}, so an untyped hook keeps
 * accepting any context.
 */
export type HookContext<T extends Handler> = 0 extends 1 & Parameters<T>[0]
  ? unknown
  : Parameters<T>[0];

/** The value a handler of type `T` resolves to. */
export type HookResult<T extends Handler> = Awaited<ReturnType<T>>;

export interface Hook<T extends Handler = Handler> {
  getHandlers(): T[];
  register(handler: T): Hook<T>;
  delete(handler: T): Hook<T>;
  call(...args: Parameters<T>): void;
}

export interface AsyncSeriesHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: Parameters<T>): Promise<void>;
}
export interface AsyncSeriesWaterfallHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: Parameters<T>): Promise<HookResult<T>>;
}

export interface AsyncParallelHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: Parameters<T>): Promise<HookResult<T>[]>;
}

export interface AsyncBailHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: Parameters<T>): Promise<HookResult<T> | undefined>;
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
      state.handlers = state.handlers.filter((registeredHandler) => registeredHandler !== handler);

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

  async call(context: HookContext<T>) {
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

  async call(param: HookContext<T>): Promise<HookContext<T>> {
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

  async call(context: HookContext<T>): Promise<HookResult<T>[]> {
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

  async call(context: HookContext<T>): Promise<HookResult<T> | undefined> {
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
