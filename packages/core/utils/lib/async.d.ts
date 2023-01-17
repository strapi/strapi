import * as pMap from "p-map";

type PromiseArray<T> = (T | Promise<T>)[];

type MapIteratee<T, R = T> = (value: T, index: number) => R | Promise<R>;

type ReduceIteratee<P, C = P, R = P> = (previousResult: P, currentValue: C, index: number) => R | Promise<R>;

export type MapAsync<T = any, R = any> = lodash.CurriedFunction3<T[], (element: T, index: number) => R | Promise<R>, { concurrency?: number }, Promise<R[]>>;

export declare function reduceAsync<T = unknown>(promiseArray: PromiseArray<T>): <R = unknown, I>(iteratee: ReduceIteratee<I | R, T, R>, initialValue?: I) => Promise<R>;
