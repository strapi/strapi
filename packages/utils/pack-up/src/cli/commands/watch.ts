import { watch as nodeWatch } from '../../node/watch';
import { handleError } from '../errors';

import type { WatchCLIOptions } from '../../node/watch';

export const watch = async (options: WatchCLIOptions) => {
  try {
    await nodeWatch(options);
  } catch (err) {
    handleError(err);
  }
};
