/** @internal Not a public API yet. */
export type Handler = (...args: any[]) => any;

/**
 * A list of handlers that run when the hook is called. Implemented by the hook factories in
 * `@strapi/utils`.
 *
 * @internal Not a public API yet.
 */
export interface Hook<T extends Handler = Handler> {
  getHandlers(): Handler[];
  register(handler: T): Hook<T>;
  delete(handler: T): Hook<T>;
  call(...args: any[]): void;
}

/**
 * Runs every handler in order with the same context.
 *
 * @internal Not a public API yet.
 */
export interface AsyncSeriesHook extends Hook {
  call(...args: any[]): Promise<void>;
}

/**
 * Runs every handler in order, passing each handler's result to the next one.
 *
 * @internal Not a public API yet.
 */
export interface AsyncSeriesWaterfallHook extends Hook {
  call(...args: any[]): Promise<any>;
}

/**
 * Runs every handler at the same time and resolves with all their results.
 *
 * @internal Not a public API yet.
 */
export interface AsyncParallelHook extends Hook {
  call(...args: any[]): Promise<any[]>;
}

/**
 * Runs every handler in order and resolves with the first result that is not `undefined`.
 *
 * @internal Not a public API yet.
 */
export interface AsyncBailHook extends Hook {
  call(...args: any[]): Promise<any>;
}
