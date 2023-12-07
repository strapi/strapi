/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import type { Store } from '../store/configure';

export type Handler = (...args: any[]) => any;

export const createHook = () => {
  const _handlers: Handler[] = [];

  return {
    register(fn: Handler) {
      _handlers.push(fn);
    },
    delete(handler: Handler) {
      _handlers.splice(_handlers.indexOf(handler), 1);
    },
    runWaterfall<T>(args: T, store?: Store) {
      return _handlers.reduce((acc, fn) => fn(acc, store), args);
    },
    async runWaterfallAsync<T>(args: T, store?: Store) {
      let result = args;

      for (const fn of _handlers) {
        result = await fn(result, store);
      }

      return result;
    },
    runSeries<T extends any[]>(...args: T) {
      return _handlers.map((fn) => fn(...args));
    },
    async runSeriesAsync<T extends any[]>(...args: T) {
      const result = [];

      for (const fn of _handlers) {
        result.push(await fn(...args));
      }

      return result;
    },
    runParallel<T extends any[]>(...args: T) {
      return Promise.all(
        _handlers.map((fn) => {
          return fn(...args);
        })
      );
    },
  };
};
