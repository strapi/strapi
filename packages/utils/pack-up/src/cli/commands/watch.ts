import { WatchCLIOptions, watch as nodeWatch } from '../../node/watch';
import { handleError } from '../errors';

export const watch = async (options: WatchCLIOptions) => {
  try {
    await nodeWatch(options);
  } catch (err) {
    handleError(err);
  }
};
