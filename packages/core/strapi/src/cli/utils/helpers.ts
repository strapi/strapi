/* eslint-disable @typescript-eslint/no-var-requires */
import chalk from 'chalk';
import { has, isString, isArray } from 'lodash/fp';
import { prompt } from 'inquirer';
import boxen from 'boxen';
import type { Command } from 'commander';

/**
 * Helper functions for the Strapi CLI
 */
const bytesPerKb = 1024;
const sizes = ['B ', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Convert bytes to a human readable formatted string, for example "1024" becomes "1KB"
 */
const readableBytes = (bytes: number, decimals = 1, padStart = 0) => {
  if (!bytes) {
    return '0';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(bytesPerKb));
  const result = `${parseFloat((bytes / bytesPerKb ** i).toFixed(decimals))} ${sizes[i].padStart(
    2
  )}`;

  return result.padStart(padStart);
};

interface ExitWithOptions {
  logger?: Console;
  prc?: NodeJS.Process;
}

/**
 *
 * Display message(s) to console and then call process.exit with code.
 * If code is zero, console.log and green text is used for messages, otherwise console.error and red text.
 *
 */
const exitWith = (code: number, message?: string | string[], options: ExitWithOptions = {}) => {
  const { logger = console, prc = process } = options;

  const log = (message: string) => {
    if (code === 0) {
      logger.log(chalk.green(message));
    } else {
      logger.error(chalk.red(message));
    }
  };

  if (isString(message)) {
    log(message);
  } else if (isArray(message)) {
    message.forEach((msg) => log(msg));
  }

  prc.exit(code);
};

/**
 * assert that a URL object has a protocol value
 *
 */
const assertUrlHasProtocol = (url: URL, protocol?: string | string[]) => {
  if (!url.protocol) {
    exitWith(1, `${url.toString()} does not have a protocol`);
  }

  // if just checking for the existence of a protocol, return
  if (!protocol) {
    return;
  }

  if (isString(protocol)) {
    if (protocol !== url.protocol) {
      exitWith(1, `${url.toString()} must have the protocol ${protocol}`);
    }
    return;
  }

  // assume an array
  if (!protocol.some((protocol) => url.protocol === protocol)) {
    return exitWith(
      1,
      `${url.toString()} must have one of the following protocols: ${protocol.join(',')}`
    );
  }
};

type ConditionCallback = (opts: Record<string, any>) => Promise<boolean>;
type IsMetCallback = (command: Command) => Promise<void>;
type IsNotMetCallback = (command: Command) => Promise<void>;

/**
 * Passes commander options to conditionCallback(). If it returns true, call isMetCallback otherwise call isNotMetCallback
 */
const ifOptions = (
  conditionCallback: ConditionCallback,
  isMetCallback: IsMetCallback = async () => {},
  isNotMetCallback: IsNotMetCallback = async () => {}
) => {
  return async (command: Command) => {
    const opts = command.opts();
    if (await conditionCallback(opts)) {
      await isMetCallback(command);
    } else {
      await isNotMetCallback(command);
    }
  };
};

const assertCwdContainsStrapiProject = (name: string) => {
  const logErrorAndExit = () => {
    console.log(
      `You need to run ${chalk.yellow(
        `strapi ${name}`
      )} in a Strapi project. Make sure you are in the right directory.`
    );
    process.exit(1);
  };

  try {
    const pkgJSON = require(`${process.cwd()}/package.json`);
    if (
      !has('dependencies.@strapi/strapi', pkgJSON) &&
      !has('devDependencies.@strapi/strapi', pkgJSON)
    ) {
      logErrorAndExit();
    }
  } catch (err) {
    logErrorAndExit();
  }
};

const runAction =
  (name: string, action: (...args: any[]) => Promise<void>) =>
  (...args: unknown[]) => {
    assertCwdContainsStrapiProject(name);

    Promise.resolve()
      .then(() => {
        return action(...args);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  };

/**
 * @description Notify users this is an experimental command and get them to approve first
 * this can be opted out by passing `yes` as a property of the args object.
 *
 * @example
 * ```ts
 * const { notifyExperimentalCommand } = require('../utils/helpers');
 *
 * const myCommand = async ({ force }) => {
 *  await notifyExperimentalCommand('plugin:build', { force });
 * }
 * ```
 */
const notifyExperimentalCommand = async (name: string, { force }: { force?: boolean } = {}) => {
  console.log(
    boxen(
      `The ${chalk.bold(
        chalk.underline(name)
      )} command is considered experimental, use at your own risk.`,
      {
        title: 'Warning',
        padding: 1,
        margin: 1,
        align: 'center',
        borderColor: 'yellow',
        borderStyle: 'bold',
      }
    )
  );

  if (!force) {
    const { confirmed } = await prompt({
      type: 'confirm',
      name: 'confirmed',
      message: 'Do you want to continue?',
    });

    if (!confirmed) {
      process.exit(0);
    }
  }
};

export {
  exitWith,
  assertUrlHasProtocol,
  ifOptions,
  readableBytes,
  runAction,
  assertCwdContainsStrapiProject,
  notifyExperimentalCommand,
};
