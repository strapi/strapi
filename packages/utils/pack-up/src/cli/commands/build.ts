import { build as nodeBuild, BuildOptions } from '../../node/build';
import { handleError } from '../errors';

export const build = async (options: BuildOptions) => {
  try {
    await nodeBuild(options);
  } catch (err) {
    handleError(err);
  }
};
