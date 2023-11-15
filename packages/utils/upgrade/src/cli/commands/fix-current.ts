import { handleError } from '../errors';
import { createLogger, tasks } from '../..';

import type { CLIOptions } from '../../types';

export const fixCurrent = async (options: CLIOptions) => {
  try {
    const logger = createLogger({ silent: options.silent, debug: options.debug });

    await tasks.fixCurrent({ logger, dryRun: options.dryRun });
  } catch (err) {
    handleError(err);
  }
};
