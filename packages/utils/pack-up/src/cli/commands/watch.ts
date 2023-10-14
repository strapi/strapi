import { WatchOptions, watch as nodeWatch } from '../../node/watch';
import { handleError } from '../errors';

export const watch = async (options: WatchOptions) => {
  try {
    await nodeWatch(options);
  } catch (err) {
    handleError(err);
  }
};
