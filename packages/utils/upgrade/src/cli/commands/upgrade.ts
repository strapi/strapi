import prompts from 'prompts';

import { loggerFactory } from '../../modules/logger';
import { handleError } from '../errors';
import * as tasks from '../../tasks';

import type { Command } from '../types';

export const upgrade: Command = async (options) => {
  try {
    const { silent, debug, yes } = options;
    const logger = loggerFactory({ silent, debug });

    logger.warn(
      "Please make sure you've created a backup of your codebase and files before upgrading"
    );

    const confirm = async (message: string) => {
      if (yes) {
        return true;
      }

      const { confirm } = await prompts({
        name: 'confirm',
        type: 'confirm',
        message,
      });

      // If confirm is undefined (Ctrl + C), default to false
      return confirm ?? false;
    };

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
