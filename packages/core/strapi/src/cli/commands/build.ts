import { createCommand } from 'commander';
import type { StrapiCommand } from '../types';

import type { BuildOptions } from '../../node/build';
import { handleUnexpectedError } from '../../node/core/errors';

type BuildCLIOptions = BuildOptions;

const action = async (options: BuildCLIOptions) => {
  try {
    if (options.bundler === 'webpack') {
      options.logger.warn(
        '[@strapi/strapi]: Using webpack as a bundler is deprecated. You should migrate to vite.'
      );
    }

    // Loaded lazily: every command is registered on CLI startup, so a static import would make
    // `strapi start` load the whole admin build toolchain (including admin source via staticFiles).
    const { build: nodeBuild } = await import('../../node/build');
    await nodeBuild(options);
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
    .action(async (options: BuildCLIOptions) => {
      return action({ ...options, ...ctx });
    });
};

export { command };
