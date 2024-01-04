import { createCommand } from 'commander';
import type { StrapiCommand } from '../../types';
import type { BuildCLIOptions } from './action';
import action from './action';

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

export default command;
