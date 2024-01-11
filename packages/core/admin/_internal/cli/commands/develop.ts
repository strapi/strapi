import boxen from 'boxen';
import chalk from 'chalk';
import cluster from 'node:cluster';

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
    if (cluster.isPrimary) {
      if (typeof options.browser !== 'undefined') {
        options.logger.warn(
          "[@strapi/strapi]: The browser argument, this is now deprecated. Use '--open' instead."
        );
      }

      if (options.bundler !== 'webpack') {
        options.logger.log(
          boxen(
            `Using ${chalk.bold(
              chalk.underline(options.bundler)
            )} as a bundler is considered experimental, use at your own risk. If you do experience bugs, open a new issue on Github – https://github.com/strapi/strapi/issues/new?template=BUG_REPORT.md`,
            {
              title: 'Warning',
              padding: 1,
              margin: 1,
              align: 'center',
              borderColor: 'yellow',
              borderStyle: 'bold',
            }
          )
        );
      }
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
