import prompts from 'prompts';

import type { Command } from 'commander';
import { loggerFactory } from '../../modules/logger';
import { Version } from '../../modules/version';
import { handleError } from '../errors';
import * as tasks from '../../tasks';
import { debugOption, dryOption, projectPathOption, rangeOption, silentOption } from '../options';

import type {
  CLIListCodemodsOptions,
  CLIRunCodemodsOptions,
  ListCodemodsCommand,
  RunCodemodsCommand,
} from '../types';
import type { Codemod } from '../../modules/codemod';

const DEFAULT_TARGET = Version.ReleaseType.Major;

export const runCodemods: RunCodemodsCommand = async (options) => {
  const { silent, debug } = options;
  const logger = loggerFactory({ silent, debug });

  logger.warn(
    "Please make sure you've created a backup of your codebase and files before running the codemods"
  );

  const confirm = async (message: string) => {
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

  return tasks
    .runCodemods({
      logger,
      confirm,
      selectCodemods,
      dry: options.dry,
      cwd: options.projectPath,
      target: options.range ?? DEFAULT_TARGET,
      uid: options.uid,
    })
    .catch((err) => handleError(err, options.silent));
};

export const listCodemods: ListCodemodsCommand = async (options) => {
  const { silent, debug } = options;
  const logger = loggerFactory({ silent, debug });

  return tasks
    .listCodemods({
      cwd: options.projectPath,
      target: options.range ?? DEFAULT_TARGET,
      logger,
    })
    .catch((err) => handleError(err, options.silent));
};

/**
 * Registers codemods related commands.
 */
export const register = (program: Command) => {
  const codemodsCommand = program.command('codemods');

  // upgrade codemods run [options] [uid]
  codemodsCommand
    .command('run [uid]')
    .description(
      `
Executes a set of codemods on the current project.

If the optional UID argument is provided, the command specifically runs the codemod associated with that UID.
Without the UID, the command produces a list of all available codemods for your project.

By default, when executed on a Strapi application project, it offers codemods matching the current major version of the app.
When executed on a Strapi plugin project, it shows every codemods.
`
    )
    .addOption(projectPathOption)
    .addOption(dryOption)
    .addOption(debugOption)
    .addOption(silentOption)
    .addOption(rangeOption)
    .action(async (uid: string | undefined, options: CLIRunCodemodsOptions) => {
      return runCodemods({ ...options, uid });
    });

  // upgrade codemods ls [options]
  codemodsCommand
    .command('ls')
    .description(`List available codemods`)
    .addOption(projectPathOption)
    .addOption(debugOption)
    .addOption(silentOption)
    .addOption(rangeOption)
    .action(async (options: CLIListCodemodsOptions) => {
      return listCodemods(options);
    });
};
