import prompts from 'prompts';

import { handleError } from '../errors';
import * as tasks from '../../tasks';

import type { CLIOptions } from '../../types';
import { createLogger } from '../../core';

export const next = async (options: CLIOptions) => {
  try {
    const logger = createLogger({ silent: options.silent, debug: options.debug });

    logger.warn(
      "Please make sure you've created a backup of your codebase and files before upgrading"
    );

    await tasks.next({ logger, confirm, dryRun: options.dryRun, cwd: options.projectPath });
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
