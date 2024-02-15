import { ValidationError } from '../errors';

export const throwInvalidParam = ({ key, path }: { key: string; path?: string | null }) => {
  const msg =
    path && path !== key ? `Invalid parameter ${key} at ${path}` : `Invalid parameter ${key}`;

  throw new ValidationError(msg);
};
