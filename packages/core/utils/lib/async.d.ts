export type MapAsync<T = any, R = any> = lodash.CurriedFunction3<
  T[],
  (element: T, index: number) => R | Promise<R>,
  { concurrency?: number },
  Promise<R[]>
>;

export type MapAsyncDialects<T = any, R = any> = (
  array: T[],
  func: (element: T, index: number) => R | Promise<R>,
  options?: { concurrency?: number }
) => Promise<R[]>;
