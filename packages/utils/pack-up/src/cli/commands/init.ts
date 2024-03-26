import { InitOptions, init as nodeInit } from '../../node/init';
import { handleError } from '../errors';

export const init = async (options: InitOptions) => {
  try {
    await nodeInit(options);
  } catch (err) {
    handleError(err);
  }
};
