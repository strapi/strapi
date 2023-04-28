import pMap from 'p-map';
import { curry, curryN } from 'lodash/fp';
import type { CurriedFunction3 } from 'lodash';

interface MapOptions {
  concurrency?: number;
}

type MapFunc<T = unknown, R = unknown> = (element: T, index: number) => R | Promise<R>;

export type ReduceAsync<T = unknown, V = T, R = V> = CurriedFunction3<
  T[],
  (accumulator: V | R, current: Awaited<T>, index: number) => R | Promise<R>,
  V,
  Promise<R>
>;

type CurriedMapAsync<T = unknown, R = unknown> = CurriedFunction3<
  T[],
  MapFunc<T, R>,
  MapOptions,
  Promise<R[]>
>;

interface Method {
  (...args: any[]): any;
}

function pipeAsync(...methods: Method[]) {
  return async (data: unknown) => {
    let res = data;
    for (let i = 0; i < methods.length; i += 1) {
      res = await methods[i](res);
    }

    return res;
  };
}

const mapAsync: CurriedMapAsync = curry(pMap);

const reduceAsync: ReduceAsync = curryN(2, async (mixedArray, iteratee, initialValue) => {
  let acc = initialValue;
  for (let i = 0; i < mixedArray.length; i += 1) {
    acc = await iteratee(acc, await mixedArray[i], i);
  }
  return acc;
});

const forEachAsync = curry(
  async <T = unknown, R = unknown>(array: T[], func: MapFunc<T, R>, options: MapOptions) => {
    await mapAsync(array, func, options);
  }
);

export { mapAsync, reduceAsync, forEachAsync, pipeAsync };
