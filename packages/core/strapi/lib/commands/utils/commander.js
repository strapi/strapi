'use strict';

const { parseType } = require('@strapi/utils/lib');
const inquirer = require('inquirer');

/**
 * argsParser: Parse a string argument from the command line as a boolean
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
 * argsParser: Parse a comma-delimited string as an array
 */
const parseInputList = (value) => {
  return value.split(',');
};

/**
 * hook: if encrpyt=true and key not provided, prompt for it
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

module.exports = {
  parseInputList,
  parseInputBool,
  promptEncryptionKey,
};
