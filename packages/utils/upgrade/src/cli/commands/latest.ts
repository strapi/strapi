import { handleError } from '../errors';

import type { CLIOptions } from '../../types';

export const latest = async (options: CLIOptions) => {
  // find current version
  // find all versions available after the current, group by major
  // loop until no next major is found
  //   next
  //   fix-current
  try {
    console.log('not implemented, upgrade to the latest version');
  } catch (err) {
    handleError(err);
  }
};
