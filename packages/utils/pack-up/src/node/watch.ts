import { CommonCLIOptions } from '../types';
import { createLogger } from './core/logger';

export interface WatchOptions extends CommonCLIOptions {
  cwd?: string;
}

export const watch = async (opts: WatchOptions) => {
  const { silent, debug } = opts;

  const logger = createLogger({ silent, debug });

  logger.log('success!');
};
