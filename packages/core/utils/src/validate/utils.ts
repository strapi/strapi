import { ValidationError } from '../errors';

export const throwInvalidKey = ({ key, path }: { key: string; path?: string | null }) => {
  const msg = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;

  throw new ValidationError(msg, {
    key,
    path,
  });
};
