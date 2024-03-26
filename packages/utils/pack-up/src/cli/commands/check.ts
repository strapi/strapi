import { CheckOptions, check as nodeCheck } from '../../node/check';
import { handleError } from '../errors';

export const check = async (options: CheckOptions) => {
  try {
    await nodeCheck(options);
  } catch (err) {
    handleError(err);
  }
};
