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

/**
 * The arguments `call` takes: the one context every handler of type `T` receives, none when the
 * handler takes no parameter, optional when its parameter is optional. Any arguments when the
 * handler's first parameter is `any`, as for the default {@link Handler}.
 */
type HookCallArgs<T extends Handler> = 0 extends 1 & Parameters<T>[0]
  ? any[]
  : TypedHookCallArgs<T>;

/**
 * The arguments of a factory hook's `call`. One `unknown` context when the handler's first
 * parameter is `any`, as for the default {@link Handler}.
 */
type FactoryHookCallArgs<T extends Handler> = 0 extends 1 & Parameters<T>[0]
  ? [context: unknown]
  : TypedHookCallArgs<T>;

/** {@link FactoryHookCallArgs}, with the parameter name the waterfall factory has always printed. */
type FactoryWaterfallCallArgs<T extends Handler> = 0 extends 1 & Parameters<T>[0]
  ? [param: unknown]
  : TypedHookCallArgs<T>;

/** The arguments of `call` for a typed handler: its first parameter, if it takes one. */
type TypedHookCallArgs<T extends Handler> =
  Parameters<T> extends []
    ? []
    : undefined extends Parameters<T>[0]
      ? [context?: HookContext<T>]
      : [context: HookContext<T>];

/**
 * A handler of a waterfall hook: it receives what the previous handler resolved to, and resolves to
 * the value the next handler receives.
 */
export type WaterfallHandler<T extends Handler> = (
  value: HookContext<T>
) => HookContext<T> | Promise<HookContext<T>>;

/**
 * What a waterfall hook of handler `T` resolves to: the value its handlers pass along. `any` when
 * the handler's first parameter is `any`, as for the default {@link Handler}.
 */
type WaterfallResult<T extends Handler> = 0 extends 1 & Parameters<T>[0] ? any : HookContext<T>;

export interface Hook<T extends Handler = Handler> {
  getHandlers(): T[];
  register(handler: T): Hook<T>;
  delete(handler: T): Hook<T>;
  call(...args: HookCallArgs<T>): void;
}

export interface AsyncSeriesHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: HookCallArgs<T>): Promise<void>;
}
export interface AsyncSeriesWaterfallHook<T extends WaterfallHandler<T> = Handler> extends Hook<T> {
  call(...args: HookCallArgs<T>): Promise<WaterfallResult<T>>;
}

export interface AsyncParallelHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: HookCallArgs<T>): Promise<HookResult<T>[]>;
}

export interface AsyncBailHook<T extends Handler = Handler> extends Hook<T> {
  call(...args: HookCallArgs<T>): Promise<HookResult<T> | undefined>;
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

  async call(...[context]: FactoryHookCallArgs<T>) {
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

  async call(...[param]: FactoryWaterfallCallArgs<T>): Promise<HookContext<T>> {
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

  async call(...[context]: FactoryHookCallArgs<T>): Promise<HookResult<T>[]> {
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

  async call(...[context]: FactoryHookCallArgs<T>): Promise<HookResult<T> | undefined> {
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
