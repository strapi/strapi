import boxen from 'boxen';
import chalk from 'chalk';
import { CheckOptions, check } from '@strapi/pack-up';
import { notifyExperimentalCommand } from '../../../utils/helpers';
import { CLIContext } from '../../../types';

interface ActionOptions extends CheckOptions {}

export default async (opts: ActionOptions, _cmd: unknown, { cwd, logger }: CLIContext) => {
  try {
    /**
     * Notify users this is an experimental command.
     */
    await notifyExperimentalCommand('plugin:verify', { force: true });

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
