import { build as nodeBuild } from '../../node/build';
import { handleError } from '../errors';

import type { BuildCLIOptions } from '../../node/build';

export const build = async (options: BuildCLIOptions) => {
  try {
    await nodeBuild(options);
  } catch (err) {
    handleError(err);
  }
};
