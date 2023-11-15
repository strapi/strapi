import { handleError } from '../errors';
import { tasks } from '../..';
import { createLogger } from '../../core';

import type { CLIOptions } from '../../types';

export const latest = async (options: CLIOptions) => {
  // find current version
  // find all versions available after the current, group by major
  // loop until no next major is found
  //   next
  //   fix-current
  try {
    const logger = createLogger({ silent: options.silent, debug: options.debug });

    await tasks.latest({ logger, dryRun: options.dryRun });
  } catch (err) {
    handleError(err);
  }
};
