import { develop as nodeDevelop, DevelopOptions } from '../../../node/develop';
import { handleUnexpectedError } from '../../../node/core/errors';

interface DevelopCLIOptions extends DevelopOptions {
  /**
   * @deprecated
   */
  browser?: boolean;
}

const develop = async (options: DevelopCLIOptions) => {
  try {
    await nodeDevelop(options);
  } catch (err) {
    handleUnexpectedError(err);
  }
};

export default develop;
export type { DevelopCLIOptions };
