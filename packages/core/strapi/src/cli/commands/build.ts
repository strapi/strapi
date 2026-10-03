import { createCommand } from 'commander';
import type { CLIContext, StrapiCommand } from '../types';

import { build as nodeBuild, BuildOptions } from '../../node/build';
import { handleUnexpectedError } from '../../node/core/errors';

type BuildCLIOptions = BuildOptions;

const action = async (options: BuildCLIOptions, ctx: CLIContext) => {
  try {
    if (options.bundler === 'webpack') {
      ctx.logger.warn(
        '[@strapi/strapi]: Using webpack as a bundler is deprecated. You should migrate to vite.'
      );
    }

    await nodeBuild(options, ctx);
  } catch (err) {
    handleUnexpectedError(err);
  }
};

/**
 * `$ strapi build`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('build')
    .option('--bundler [bundler]', 'Bundler to use (webpack or vite)', 'vite')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--minify', 'Minify the output', true)
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'Produce sourcemaps', false)
    .option('--stats', 'Print build statistics to the console', false)
    .option('--install-deps', 'Auto-install missing admin dependencies', false)
    .description('Build the strapi admin app')
    .action((options) => action(options, ctx));
};

export { command };
