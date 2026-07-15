/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import type { Store } from '../store/configure';

export type Handler<TArgs extends unknown[] = never[], TResult = unknown> = (
  ...args: TArgs
) => TResult;

type RegisteredHandler = Handler<unknown[], unknown>;

export const createHook = () => {
  const _handlers: RegisteredHandler[] = [];

  return {
    register<TArgs extends unknown[], TResult>(fn: Handler<TArgs, TResult>) {
      _handlers.push(fn as unknown as RegisteredHandler);
    },
    delete<TArgs extends unknown[], TResult>(handler: Handler<TArgs, TResult>) {
      _handlers.splice(_handlers.indexOf(handler as unknown as RegisteredHandler), 1);
    },
    runWaterfall<T>(args: T, store?: Store) {
      return _handlers.reduce<T>((acc, fn) => fn(acc, store) as T, args);
    },
    async runWaterfallAsync<T>(args: T, store?: Store) {
      let result = args;

      for (const fn of _handlers) {
        result = (await fn(result, store)) as T;
      }

      return result;
    },
    runSeries<TArgs extends unknown[]>(...args: TArgs) {
      return _handlers.map((fn) => fn(...args));
    },
    async runSeriesAsync<TArgs extends unknown[]>(...args: TArgs) {
      const result: unknown[] = [];

      for (const fn of _handlers) {
        result.push(await fn(...args));
      }

      return result;
    },
    runParallel<TArgs extends unknown[]>(...args: TArgs) {
      return Promise.all(
        _handlers.map((fn) => {
          return fn(...args);
        })
      );
    },
  };
};
