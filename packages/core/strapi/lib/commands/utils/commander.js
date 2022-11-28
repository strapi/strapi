'use strict';

const { parseType } = require('@strapi/utils/lib');
const inquirer = require('inquirer');
const { isArray } = require('lodash');

/**
 * Parse a string argument from the command line as a boolean
 * Can be passed to option.argParser
 */
const parseInputBool = (arg) => {
  try {
    return parseType({ type: 'boolean', value: arg });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
};

/**
 * Parse a comma-delimited string as an array
 * Return value can be passed to option.argParser
 *
 * @param {string[]|undefined} [validOptions=undefined] Array of string values that will be accepted in the list
 * @returns {(string) => string[]}
 */
const createListParser = (validOptions = undefined) => {
  return (value) => {
    const values = value.split(',');
    if (isArray(validOptions)) {
      values.forEach((value) => {
        if (!validOptions.includes(value)) {
          console.error(`Value '${value}' is not recognized as a valid option`);
          process.exit(1);
        }
      });
    }
    return values;
  };
};

/**
 * Command hook that if encrpyt=true and key is not provided, prompt for it
 */
const promptEncryptionKey = async (thisCommand) => {
  const opts = thisCommand.opts();

  if (!opts.encrypt && opts.key) {
    console.error('Key may not be present unless encryption is used');
    process.exit(1);
  }

  // if encrypt is set but we have no key, prompt for it
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
      console.error('Failed to get encryption key');
      process.exit(1);
    }
    if (!opts.key) {
      console.error('Failed to get encryption key');
      process.exit(1);
    }
  }
};

/**
 * Command hook to confirm that key has a value with a provided message
 */
const confirmKeyValue = (key, value, message, defaultYes = false) => {
  return async (thisCommand) => {
    const opts = thisCommand.opts();

    if (!opts[key] || opts[key] !== value) {
      console.error(`Could not confirm key ${key}, halting operation.`);
      process.exit(1);
    }
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        message,
        name: `confirm_${key}`,
        default: defaultYes,
      },
    ]);
    if (!answers[`confirm_${key}`]) {
      process.exit(0);
    }
  };
};

module.exports = {
  createListParser,
  parseInputBool,
  promptEncryptionKey,
  confirmKeyValue,
};
