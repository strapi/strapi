import { handleError } from '../errors';

import type { CLIOptions } from '../../types';

export const fixCurrent = async (options: CLIOptions) => {
  try {
    console.log('not implemented, fix current major version');
  } catch (err) {
    handleError(err);
  }
};
