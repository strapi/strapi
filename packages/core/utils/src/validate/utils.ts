// Keep asynchronous return values in the types of partially applied functions.
// TODO: Export this from root @strapi/utils so we don't have copies of it between packages

import { curry } from '../curry';
import { ValidationError } from '../errors';

export const throwInvalidKey = ({
  key,
  path,
  reason,
}: {
  key: string;
  path?: string | null;
  reason?: string;
}): never => {
  const location = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;
  const msg = reason ? `${location}: ${reason}` : location;

  throw new ValidationError(msg, {
    key,
    path,
  });
};

export const asyncCurry = <A extends unknown[], R>(
  fn: (...args: A) => Promise<R>
): ((...args: Partial<A>) => any) => curry(fn as (...args: unknown[]) => Promise<R>);
