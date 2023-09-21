import { CommonCLIOptions } from '../types';

import { createLogger } from './core/logger';

export type InitOptions = CommonCLIOptions;

export const init = async (opts: InitOptions) => {
  const { silent, debug } = opts;

  const logger = createLogger({ silent, debug });

  logger.log('success!');
};
