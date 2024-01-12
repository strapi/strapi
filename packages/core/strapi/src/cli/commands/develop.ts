import { createCommand } from 'commander';
import boxen from 'boxen';
import chalk from 'chalk';
import cluster from 'node:cluster';
import type { StrapiCommand } from '../types';
import { develop as nodeDevelop, DevelopOptions } from '../../node/develop';
import { handleUnexpectedError } from '../../node/core/errors';

interface DevelopCLIOptions extends DevelopOptions {
  /**
   * @deprecated
   */
  browser?: boolean;
}

const action = async (options: DevelopCLIOptions) => {
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

/**
 * `$ strapi develop`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('develop')
    .alias('dev')
    .option('--bundler [bundler]', 'Bundler to use (webpack or vite)', 'webpack')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .option('--ignore-prompts', 'Ignore all prompts', false)
    .option('--polling', 'Watch for file changes in network directories', false)
    .option('--watch-admin', 'Watch the admin panel for hot changes', false)
    .option(
      '--no-build',
      '[deprecated]: there is middleware for the server, it is no longer a separate process'
    )
    .option(
      '--watch-admin',
      '[deprecated]: there is now middleware for watching, it is no longer a separate process'
    )
    .option('--browser <name>', '[deprecated]: use open instead')
    .option('--open', 'Open the admin in your browser', true)
    .description('Start your Strapi application in development mode')
    .action(async (options: DevelopCLIOptions) => {
      return action({ ...options, ...ctx });
    });
};

export { command };
