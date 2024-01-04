import { build as nodeBuild, BuildOptions } from '../../../node/build';
import { handleUnexpectedError } from '../../../node/core/errors';

interface BuildCLIOptions extends BuildOptions {
  /**
   * @deprecated use `minify` instead
   */
  optimization?: boolean;
}

const build = async (options: BuildCLIOptions) => {
  try {
    await nodeBuild(options);
  } catch (err) {
    handleUnexpectedError(err);
  }
};

export default build;
export type { BuildCLIOptions };
