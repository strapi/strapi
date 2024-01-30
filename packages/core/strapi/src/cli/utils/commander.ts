/**
 * This file includes hooks to use for commander.hook and argParsers for commander.argParser
 */

import inquirer from 'inquirer';
import { Command, InvalidOptionArgumentError, Option } from 'commander';
import chalk from 'chalk';
import { isNaN } from 'lodash/fp';
import { exitWith } from './helpers';

/**
 * argParser: Parse a comma-delimited string as an array
 */
const parseList = (value: string) => {
  try {
    return value.split(',').map((item) => item.trim()); // trim shouldn't be necessary but might help catch unexpected whitespace characters
  } catch (e) {
    exitWith(1, `Unrecognized input: ${value}`);
  }

  return [];
};

/**
 * Returns an argParser that returns a list
 */
const getParseListWithChoices = (choices: string[], errorMessage = 'Invalid options:') => {
  return (value: string) => {
    const list = parseList(value);
    const invalid = list.filter((item) => {
      return !choices.includes(item);
    });

    if (invalid.length > 0) {
      exitWith(1, `${errorMessage}: ${invalid.join(',')}`);
    }

    return list;
  };
};

/**
 * argParser: Parse a string as an integer
 */
const parseInteger = (value: string) => {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidOptionArgumentError(`Not an integer: ${value}`);
  }
  return parsedValue;
};

/**
 * argParser: Parse a string as a URL object
 */
const parseURL = (value: string) => {
  try {
    const url = new URL(value);
    if (!url.host) {
      throw new InvalidOptionArgumentError(`Could not parse url ${value}`);
    }

    return url;
  } catch (e) {
    throw new InvalidOptionArgumentError(`Could not parse url ${value}`);
  }
};

/**
 * hook: if encrypt==true and key not provided, prompt for it
 */
const promptEncryptionKey = async (thisCommand: Command) => {
  const opts = thisCommand.opts();

  if (!opts.encrypt && opts.key) {
    return exitWith(1, 'Key may not be present unless encryption is used');
  }

  // if encrypt==true but we have no key, prompt for it
  if (opts.encrypt && !(opts.key && opts.key.length > 0)) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          message: 'Please enter an encryption key',
          name: 'key',
          validate(key) {
            if (key.length > 0) return true;

            return 'Key must be present when using the encrypt option';
          },
        },
      ]);
      opts.key = answers.key;
    } catch (e) {
      return exitWith(1, 'Failed to get encryption key');
    }
    if (!opts.key) {
      return exitWith(1, 'Failed to get encryption key');
    }
  }
};

/**
 * hook: require a confirmation message to be accepted unless forceOption (-f,--force) is used
 */
const getCommanderConfirmMessage = (
  message: string,
  { failMessage }: { failMessage?: string } = {}
) => {
  return async (command: Command) => {
    const confirmed = await confirmMessage(message, { force: command.opts().force });
    if (!confirmed) {
      exitWith(1, failMessage);
    }
  };
};

const confirmMessage = async (message: string, { force }: { force?: boolean } = {}) => {
  // if we have a force option, respond yes
  if (force === true) {
    // attempt to mimic the inquirer prompt exactly
    console.log(`${chalk.green('?')} ${chalk.bold(message)} ${chalk.cyan('Yes')}`);
    return true;
  }

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      message,
      name: `confirm`,
      default: false,
    },
  ]);

  return answers.confirm;
};

const forceOption = new Option(
  '--force',
  `Automatically answer "yes" to all prompts, including potentially destructive requests, and run non-interactively.`
);

export {
  getParseListWithChoices,
  parseList,
  parseURL,
  parseInteger,
  promptEncryptionKey,
  getCommanderConfirmMessage,
  confirmMessage,
  forceOption,
};
