import { CommonCLIOptions } from '../types';
import { createLogger } from './core/logger';

export interface CheckOptions extends CommonCLIOptions {}

export const check = async (opts: CheckOptions) => {
  const { silent, debug } = opts;

  const logger = createLogger({ silent, debug });

  console.log('success!');
};
