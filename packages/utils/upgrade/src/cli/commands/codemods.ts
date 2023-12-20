import prompts from 'prompts';
import { loggerFactory } from '../../modules/logger';
import { handleError } from '../errors';
import * as tasks from '../../tasks';

import type { Command } from '../types';
import type { Codemod } from '../../modules/codemod';

export const runCodemods: Command = async (options) => {
  try {
    const { silent, debug, yes } = options;
    const logger = loggerFactory({ silent, debug });

    logger.warn(
      "Please make sure you've created a backup of your codebase and files before running the codemods"
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
            title: `(${version}) ${codemod.format()}`,
            value: codemod,
            selected: true,
          }))
        )
        .flat();

      if (selectableCodemods.length === 0) {
        logger.info('No codemods to run');
        return [];
      }

      const { selectedCodemods }: { selectedCodemods: Codemod.Codemod[] } = await prompts({
        type: 'autocompleteMultiselect',
        name: 'selectedCodemods',
        message: 'Choose the codemods you would like to run:',
        choices: selectableCodemods,
      });

      if (!selectedCodemods || selectedCodemods.length === 0) {
        logger.info('No codemods selected');
        return [];
      }

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
