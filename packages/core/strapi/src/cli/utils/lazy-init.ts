/**
 * Lazy Singleton pattern
 *
 * `TReturn` is restricted to objects so the cached instance is always truthy.
 */
export function lazyInit<TReturn extends object, const TArgs extends unknown[] = []>(
  init: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  let instance: TReturn | undefined;

  return (...args: TArgs): TReturn => {
    if (!instance) instance = init(...args);
    return instance;
  };
}
