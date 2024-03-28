import { init as nodeInit } from '../../node/init';
import { handleError } from '../errors';

import type { InitOptions } from '../../node/init';

export const init = async (options: InitOptions) => {
  try {
    await nodeInit(options);
  } catch (err) {
    handleError(err);
  }
};
