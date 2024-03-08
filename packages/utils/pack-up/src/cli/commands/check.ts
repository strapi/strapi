import { check as nodeCheck } from '../../node/check';
import { handleError } from '../errors';

import type { CheckOptions } from '../../node/check';

export const check = async (options: CheckOptions) => {
  try {
    await nodeCheck(options);
  } catch (err) {
    handleError(err);
  }
};
