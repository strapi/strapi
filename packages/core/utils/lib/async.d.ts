import { CurriedFunction3 } from 'lodash';

export type MapAsync<T = any, R = any> = CurriedFunction3<
  T[],
  (element: T, index: number) => R | Promise<R>,
  { concurrency?: number },
  Promise<R[]>
>;

export type ForEachAsync<T = any, R = any> = (
  array: T[],
  func: (element: T, index: number) => R | Promise<R>,
  options?: { concurrency?: number }
) => Promise<R[]>;

export type ReduceAsync<T = any, V = T, R = V> = CurriedFunction3<
  T[],
  (accumulator: V | R, current: Awaited<T>, index: number) => R | Promise<R>,
  V,
  Promise<R>
>;
