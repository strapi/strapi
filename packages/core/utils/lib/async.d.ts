export type MapAsync<T = any, R = any> = lodash.CurriedFunction3<T[], (element: T, index: number) => R | Promise<R>, { concurrency?: number }, Promise<R[]>>;
