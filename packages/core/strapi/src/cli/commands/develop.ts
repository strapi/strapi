import { createCommand } from 'commander';
import cluster from 'node:cluster';
import type { CLIContext, StrapiCommand } from '../types';
import { develop as nodeDevelop, DevelopOptions } from '../../node/develop';
import { handleUnexpectedError } from '../../node/core/errors';

type DevelopCLIOptions = DevelopOptions;

const action = async (options: DevelopCLIOptions, ctx: CLIContext) => {
  try {
    if (cluster.isPrimary) {
      if (options.bundler === 'webpack') {
        ctx.logger.warn(
          '[@strapi/strapi]: Using webpack as a bundler is deprecated. You should migrate to vite.'
        );
      }
    }

    await nodeDevelop(options, ctx);
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
    .option('--bundler [bundler]', 'Bundler to use (webpack or vite)', 'vite')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .option('--polling', 'Watch for file changes in network directories', false)
    .option('--watch-admin', 'Watch the admin panel for hot changes', true)
    .option('--no-watch-admin', 'Do not watch the admin panel for hot changes')
    .option('--build-admin', 'Build the admin panel', true)
    .option('--no-build-admin', 'Do not build the admin panel in case watch is disabled')
    .option('--open', 'Open the admin in your browser', true)
    .option('--install-deps', 'Auto-install missing admin dependencies', true)
    .option('--no-install-deps', 'Do not auto-install missing admin dependencies')
    .description('Start your Strapi application in development mode')
    .action((options) => action(options, ctx));
};

export { command };
