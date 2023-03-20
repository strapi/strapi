'use strict';

/**
 * This file includes hooks to use for commander.hook and argParsers for commander.argParser
 */

const inquirer = require('inquirer');
const { InvalidOptionArgumentError, Option } = require('commander');
const { bold, green, cyan } = require('chalk');
const { exitWith } = require('./helpers');

/**
 * argParser: Parse a comma-delimited string as an array
 */
const parseList = (value) => {
  let list;
  try {
    list = value.split(',').map((item) => item.trim()); // trim shouldn't be necessary but might help catch unexpected whitespace characters
  } catch (e) {
    exitWith(1, `Unrecognized input: ${value}`);
  }
  return list;
};

/**
 * Returns an argParser that returns a list
 */
const getParseListWithChoices = (choices, errorMessage = 'Invalid options:') => {
  return (value) => {
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
 * argParser: Parse a string as a URL object
 */
const parseURL = (value) => {
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
const promptEncryptionKey = async (thisCommand) => {
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
 *
 * @param {string} message The message to confirm with user
 * @param {object} options Additional options
 * @param {string|undefined} options.failMessage The message to display when prompt is not confirmed
 */
const confirmMessage = (message, { failMessage } = {}) => {
  return async (command) => {
    // if we have a force option, assume yes
    const opts = command.opts();
    if (opts?.force === true) {
      // attempt to mimic the inquirer prompt exactly
      console.log(`${green('?')} ${bold(message)} ${cyan('Yes')}`);
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        message,
        name: `confirm`,
        default: false,
      },
    ]);
    if (!answers.confirm) {
      exitWith(1, failMessage);
    }
  };
};

const forceOption = new Option(
  '--force',
  `Automatically answer "yes" to all prompts, including potentially destructive requests, and run non-interactively.`
);

module.exports = {
  getParseListWithChoices,
  parseList,
  parseURL,
  promptEncryptionKey,
  confirmMessage,
  forceOption,
};
