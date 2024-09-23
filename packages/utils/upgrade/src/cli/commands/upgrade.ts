import prompts from 'prompts';
import { InvalidArgumentError, Option } from 'commander';

import type { Command } from 'commander';
import { loggerFactory } from '../../modules/logger';
import { Version, isLiteralSemVer, isValidSemVer, semVerFactory } from '../../modules/version';
import { handleError } from '../errors';
import * as tasks from '../../tasks';
import {
  autoConfirmOption,
  debugOption,
  dryOption,
  projectPathOption,
  silentOption,
} from '../options';

import type { CLIUpgradeOptions, CLIUpgradeToOptions, UpgradeCommand } from '../types';

export const upgrade: UpgradeCommand = async (options) => {
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
      codemodsTarget: options.codemodsTarget,
    });
  } catch (err) {
    handleError(err, options.silent);
  }
};

/**
 * Registers upgrade related codemods.
 */
export const register = (program: Command) => {
  const addReleaseUpgradeCommand = (releaseType: Version.ReleaseType, description: string) => {
    program
      .command(releaseType)
      .description(description)
      .addOption(projectPathOption)
      .addOption(dryOption)
      .addOption(debugOption)
      .addOption(silentOption)
      .addOption(autoConfirmOption)
      .action(async (options: CLIUpgradeOptions) => {
        return upgrade({ ...options, target: releaseType });
      });
  };

  // upgrade major
  addReleaseUpgradeCommand(
    Version.ReleaseType.Major,
    'Upgrade to the next available major version of Strapi'
  );

  // upgrade minor
  addReleaseUpgradeCommand(
    Version.ReleaseType.Minor,
    'Upgrade to the latest minor and patch version of Strapi for the current major'
  );

  // upgrade patch
  addReleaseUpgradeCommand(
    Version.ReleaseType.Patch,
    'Upgrade to latest patch version of Strapi for the current major and minor'
  );

  // upgrade to <target>
  program
    .command('to <target>', { hidden: true })
    .description('Upgrade to the specified version of Strapi')
    .addOption(projectPathOption)
    .addOption(dryOption)
    .addOption(debugOption)
    .addOption(silentOption)
    .addOption(autoConfirmOption)
    .addOption(
      new Option(
        '-c, --codemods-target <codemodsTarget>',
        'Use a custom target for the codemods execution. Useful when targeting pre-releases'
      ).argParser((codemodsTarget) => {
        if (!isLiteralSemVer(codemodsTarget)) {
          throw new InvalidArgumentError(
            `Expected a version with the following format: "<number>.<number>.<number>"`
          );
        }

        return semVerFactory(codemodsTarget);
      })
    )
    .action(async (target: string, options: CLIUpgradeToOptions) => {
      if (!isValidSemVer(target)) {
        console.error(`Invalid target supplied, expected a valid semver but got "${target}"`);
        process.exit(1);
      }

      return upgrade({ ...options, target: semVerFactory(target) });
    });
};
