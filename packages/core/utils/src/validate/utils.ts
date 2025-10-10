// lodash/fp curry does not handle async functions properly, and creates very "ugly" types,
// so we will use our own version to ensure curried functions are typed correctly
// TODO: Export this from root @strapi/utils so we don't have copies of it between packages

import { ValidationError } from '../errors';

export const throwInvalidKey = ({ key, path }: { key: string; path?: string | null }): never => {
  const msg = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;

  throw new ValidationError(msg, {
    key,
    path,
  });
};

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
