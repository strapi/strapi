import { ValidationError } from '../errors';

export const throwInvalidParam = ({ key }: { key: string }) => {
  throw new ValidationError(`Invalid parameter ${key}`);
};
