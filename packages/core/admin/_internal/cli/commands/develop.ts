import { develop as nodeDevelop, DevelopOptions } from '../../node/develop';
import { handleUnexpectedError } from '../../node/core/errors';

interface DevelopCLIOptions extends DevelopOptions {
  /**
   * @deprecated
   */
  browser?: boolean;
}

const develop = async (options: DevelopCLIOptions) => {
  try {
    if (typeof options.browser !== 'undefined') {
      options.logger.warn(
        "[@strapi/strapi]: The browser argument, this is now deprecated. Use '--open' instead."
      );
    }

    await nodeDevelop({
      ...options,
      open: options.browser ?? options.open,
    });
  } catch (err) {
    handleUnexpectedError(err);
  }
};

export { develop };
export type { DevelopCLIOptions };
