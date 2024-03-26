import { build as nodeBuild, BuildCLIOptions } from '../../node/build';
import { handleError } from '../errors';

export const build = async (options: BuildCLIOptions) => {
  try {
    await nodeBuild(options);
  } catch (err) {
    handleError(err);
  }
};
