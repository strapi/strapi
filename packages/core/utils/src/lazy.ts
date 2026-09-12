/**
 * Lazy Singleton pattern
 */
export function lazyInit<TReturn, const TArgs extends unknown[] = []>(
  init: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  let instance: TReturn | undefined;

  return (...args: TArgs): TReturn => {
    if (!instance) instance = init(...args);
    return instance;
  };
}
