import boxen from 'boxen';
import chalk from 'chalk';
import { CheckOptions, check } from '@strapi/pack-up';

import { runAction } from '../../utils/helpers';
import type { StrapiCommand, CLIContext } from '../../types';

interface ActionOptions extends CheckOptions {}

const action = async (opts: ActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    await check({
      cwd,
      ...opts,
    });
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    if (err instanceof Error && err.stack) {
      console.log(
        chalk.red(
          boxen(err.stack, {
            padding: 1,
            align: 'left',
          })
        )
      );
    }
    process.exit(1);
  }
};

/**
 * `$ strapi plugin:verify`
 */
const command: StrapiCommand = ({ command, ctx }) => {
  command
    .command('plugin:verify')
    .description('Verify the output of your plugin before publishing it.')
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .action((...args) => runAction('plugin:verify', action)(...args, ctx));
};

export { command };
