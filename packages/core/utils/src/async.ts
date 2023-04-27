import pMap from 'p-map';
import { curry, curryN } from 'lodash/fp';
import type { CurriedFunction3 } from 'lodash';

export type MapAsync<T = unknown, R = unknown> = CurriedFunction3<
  T[],
  (element: T, index: number) => R | Promise<R>,
  { concurrency?: number },
  Promise<R[]>
>;

export type ForEachAsync<T = unknown, R = unknown> = (
  array: T[],
  func: (element: T, index: number) => R | Promise<R>,
  options?: { concurrency?: number }
) => Promise<R[]>;

export type ReduceAsync<T = unknown, V = T, R = V> = CurriedFunction3<
  T[],
  (accumulator: V | R, current: Awaited<T>, index: number) => R | Promise<R>,
  V,
  Promise<R>
>;

function pipeAsync(...methods) {
  return async (data) => {
    let res = data;
    for (let i = 0; i < methods.length; i += 1) {
      res = await methods[i](res);
    }

    return res;
  };
}

const mapAsync: MapAsync = curry(pMap);

const reduceAsync: ReduceAsync = curryN(2, async (mixedArray, iteratee, initialValue) => {
  let acc = initialValue;
  for (let i = 0; i < mixedArray.length; i += 1) {
    acc = await iteratee(acc, await mixedArray[i], i);
  }
  return acc;
});

const forEachAsync: ForEachAsync = curry(async (array, func, options) => {
  await mapAsync(array, func, options);
});

export { mapAsync, reduceAsync, forEachAsync, pipeAsync };
