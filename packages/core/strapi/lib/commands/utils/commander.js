'use strict';

const inquirer = require('inquirer');

/**
 * argsParser: Parse a comma-delimited string as an array
 */
const parseInputList = (value) => {
  return value.split(',');
};

/**
 * hook: if encrypt==true and key not provided, prompt for it
 */
const promptEncryptionKey = async (thisCommand) => {
  const opts = thisCommand.opts();

  if (!opts.encrypt && opts.key) {
    console.error('Key may not be present unless encryption is used');
    process.exit(1);
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
 * hook: require a confirmation message to be accepted
 */
const confirmMessage = (message) => {
  return async () => {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        message,
        name: `confirm`,
        default: false,
      },
    ]);
    if (!answers.confirm) {
      process.exit(0);
    }
  };
};

module.exports = {
  parseInputList,
  promptEncryptionKey,
  confirmMessage,
};
