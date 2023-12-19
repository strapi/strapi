import prompts from 'prompts';

import inquirer from 'inquirer';
import { loggerFactory } from '../../modules/logger';
import { handleError } from '../errors';
import * as tasks from '../../tasks';

import type { Command } from '../types';
import { Codemod } from '../../modules/codemod';

export const runCodemods: Command = async (options) => {
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

    const selectCodemods = async (codemods: Codemod.VersionedCollection[]) => {
      const selectableCodemods = codemods
        .map(({ version, codemods }) =>
          codemods.map((codemod) => ({
            name: `(${version}) ${codemod.filename}`,
            value: codemod,
            checked: true,
          }))
        )
        .flat();

      const prompt = [
        {
          type: 'checkbox',
          name: 'selectedCodemods',
          message: 'Choose the codemods you would like to run:',
          choices: selectableCodemods,
        },
      ];

      const { selectedCodemods } = await inquirer.prompt<{
        selectedCodemods: Codemod.Codemod[];
      }>(prompt);

      return selectedCodemods.map<Codemod.VersionedCollection>((codemod) => ({
        version: codemod.version,
        codemods: [codemod],
      }));
    };

    await tasks.runCodemods({
      logger,
      confirm,
      selectCodemods,
      dry: options.dry,
      cwd: options.projectPath,
      target: options.target,
    });
  } catch (err) {
    handleError(err);
  }
};
