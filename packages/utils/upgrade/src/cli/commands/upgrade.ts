import prompts from 'prompts';

import { loggerFactory } from '../../modules/logger';
import { handleError } from '../errors';
import * as tasks from '../../tasks';

import type { Command } from '../types';

export const upgrade: Command = async (options) => {
  try {
    const logger = loggerFactory({ silent: options.silent, debug: options.debug });

    logger.warn(
      "Please make sure you've created a backup of your codebase and files before upgrading"
    );

    await tasks.upgrade({
      logger,
      confirm,
      dry: options.dry,
      cwd: options.projectPath,
      target: options.target,
    });
  } catch (err) {
    handleError(err);
  }
};

const confirm = async (message: string) => {
  const { confirm } = await prompts({
    name: 'confirm',
    type: 'confirm',
    message,
  });

  // If confirm is undefined (Ctrl + C), default to false
  return confirm ?? false;
};
