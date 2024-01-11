import { createCommand } from 'commander';
import type { StrapiCommand } from '../types';

import { build as nodeBuild, BuildOptions } from '../../node/build';
import { handleUnexpectedError } from '../../node/core/errors';

export interface BuildCLIOptions extends BuildOptions {
  /**
   * @deprecated use `minify` instead
   */
  optimization?: boolean;
}

const action = async (options: BuildCLIOptions) => {
  try {
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
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--ignore-prompts', 'Ignore all prompts', false)
    .option('--minify', 'Minify the output', true)
    .option('--no-optimization', '[deprecated]: use minify instead')
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'Produce sourcemaps', false)
    .option('--stats', 'Print build statistics to the console', false)
    .description('Build the strapi admin app')
    .action(async (options: BuildCLIOptions) => {
      return action({ ...options, ...ctx });
    });
};

export { command };
