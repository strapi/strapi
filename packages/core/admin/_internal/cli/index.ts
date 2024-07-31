import type { StrapiCommand } from '@strapi/strapi';
import type { BuildCLIOptions } from './commands/build';
import type { DevelopCLIOptions } from './commands/develop';

/**
 * `$ strapi build`
 */
const build: StrapiCommand = ({ command, ctx }) => {
  command
    .command('build')
    .option('--bundler [bundler]', 'Bundler to use (webpack or vite)', 'webpack')
    .option('--ignore-prompts', 'Ignore all prompts', false)
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--ignore-prompts', 'Ignore all prompts', false)
    .option('--minify', 'Minify the output', true)
    .option('--no-optimization', '[deprecated]: use minify instead')
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'Produce sourcemaps', false)
    .option('--stats', 'Print build statistics to the console', false)
    .description('Build the strapi admin app')
    .action(async (options: BuildCLIOptions) => {
      const { build } = await import('./commands/build');

      return build({ ...options, ...ctx });
    });
};

/**
 * `$ strapi develop`
 */
const develop: StrapiCommand = ({ command, ctx }) => {
  command
    .command('develop')
    .alias('dev')
    .option('--bundler [bundler]', 'Bundler to use (webpack or vite)', 'webpack')
    .option('--ignore-prompts', 'Ignore all prompts', false)
    .option('--watch-admin', 'Watch the admin panel for hot changes', false)
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
      const { develop } = await import('./commands/develop');

      return develop({ ...options, ...ctx });
    });
};

export { build, develop };
