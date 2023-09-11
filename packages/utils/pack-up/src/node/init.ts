import { CommonCLIOptions } from '../types';
import { createLogger } from './core/logger';

export interface InitOptions extends CommonCLIOptions {}

export const init = async (opts: InitOptions) => {
  const { silent, debug } = opts;

  const logger = createLogger({ silent, debug });

  console.log('success!');
};
