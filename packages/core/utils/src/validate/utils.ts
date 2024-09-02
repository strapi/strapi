import { ValidationError } from '../errors';

export const throwInvalidKey = ({ key, path }: { key: string; path?: string | null }): never => {
  const msg = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;

  throw new ValidationError(msg, {
    key,
    path,
  });
};

// lodash/fp curry does not detect async methods, so we'll use our own that is typed correctly
export const asyncCurry = <A extends unknown[], R>(
  fn: (...args: A) => Promise<R>
): ((...args: Partial<A>) => any) => {
  const curried = (...args: unknown[]): unknown => {
    if (args.length >= fn.length) {
      return fn(...(args as A));
    }
    return (...moreArgs: unknown[]) => curried(...args, ...moreArgs);
  };

  return curried;
};
