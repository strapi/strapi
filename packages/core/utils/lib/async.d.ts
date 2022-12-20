
type PromiseArray<T> = (T | Promise<T>)[];

type MapIteratee<T, R = T> = (value: T, index: number) => R | Promise<R>;

type ReduceIteratee<P, C = P, R = P> = (previousResult: P, currentValue: C, index: number) => R | Promise<R>;

export declare function mapAsync<T = unknown>(numberPromiseArray: number[], options: { concurrency: number }): <R = T>(iteratee: MapIteratee<T, R>) => Promise<R[]>;

export declare function reduceAsync<T = unknown>(promiseArray: PromiseArray<T>): <R = unknown, I>(iteratee: ReduceIteratee<I | R, T, R>, initialValue?: I) => Promise<R>;
