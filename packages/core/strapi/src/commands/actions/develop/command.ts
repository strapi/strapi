import { createCommand } from 'commander';
import type { StrapiCommand } from '../../types';
import type { DevelopCLIOptions } from './action';
import action from './action';

/**
 * `$ strapi develop`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('develop')
    .alias('dev')
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

export default command;
