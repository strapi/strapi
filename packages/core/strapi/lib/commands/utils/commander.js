'use strict';

const chalk = require('chalk');
const inquirer = require('inquirer');
const { isArray } = require('lodash');
const { isString } = require('lodash/fp');
const axios = require('axios');

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
 * prompt for auth information for Strapi
 */
const promptAuth = async (name, options) => {
  const prompts = [];
  if (!options?.email?.disabled) {
    prompts.push({
      type: 'email', // must match the email field from the admin API /login route
      message: `Enter the admin user email for ${name}`,
      name: `email`,
      validate(email) {
        if (email.length > 0) return true;

        return 'Email must not be blank';
      },
    });
  }
  if (!options?.password?.disabled) {
    prompts.push({
      type: 'password', // must match the password field from the admin API /login route
      message: `Please enter the admin user password for ${name}`,
      name: `password`,
      validate(pass) {
        if (pass.length > 0) return true;

        return 'Password must not be blank';
      },
    });
  }

  if (!prompts.length) return undefined;

  const answers = await inquirer.prompt(prompts);
  return answers;
};

/**
 * given a field containing a url, prompt for email/password and use it to attempt to get a bearer token from the remote content api, and add it to command opts as {field}Token
 */
const getAuthResolverFor = (field) => {
  return async (command) => {
    const opts = command.opts();
    if (!opts[field]) {
      return;
    }

    console.log('opts', opts);
    let login;
    if (opts[`${field}Email`] && opts[`${field}Password`]) {
      login = { email: opts[`${field}Email`], password: opts[`${field}Password`] };
    } else {
      login = await promptAuth(opts[field], {
        email: { disabled: !!opts[`${field}Email`] },
        password: { disabled: !!opts[`${field}Password`] },
      });
    }
    console.log('using auth', login);

    try {
      const token = await resolveAuth(login, opts[field]);
      opts[`${field}Token`] = token;

      console.log('resolved auth', token);
    } catch (e) {
      console.error(JSON.stringify(e));
      process.exit(1);
    }
    process.exit(0);
  };
};

/**
 * call the admin api login with login info
 */
const resolveAuth = async (login, url) => {
  try {
    const res = await axios.post(`${url}/login`, login, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.data?.data?.token) {
      return res.data.data.token;
    }

    // This should only be possible if the site returns a 200 status without a token; probably not a Strapi instance?
    throw new Error(`Could not authenticate with ${url}`);
  } catch (e) {
    // an error response from server
    const data = e?.response?.data;
    if (data?.error?.message) {
      console.error(`"${data.error.message}" received from ${url}`);
      process.exit(1);
    }

    // failure to get response from server
    const errorCode = e?.code;
    if (errorCode) {
      console.error(`"${errorCode}" received from ${url}`);
      process.exit(1);
    }

    // Unknown error
    console.error(`Unknown error from ${url}:`);
    console.error(JSON.stringify(e, undefined, 2));
    process.exit(1);
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

const ifOptions = (conditionCallback, isMetCallback = () => {}, isNotMetCallback = () => {}) => {
  return async (command) => {
    const opts = command.opts();
    if (await conditionCallback(opts)) {
      await isMetCallback(command);
    } else {
      await isNotMetCallback(command);
    }
  };
};

/**
 *
 * Display message(s) to console and then call process.exit with code.
 * If code is zero, console.log and green text is used for messages, otherwise console.error and red text.
 *
 * @param {number} code Code to exit process with
 * @param {string | Array} message Message(s) to display before exiting
 */
const exitWith = (code, message = undefined) => {
  const logger = (message) => {
    if (code === 0) {
      console.log(chalk.green(message));
    } else {
      console.log(chalk.red(message));
    }
  };

  if (isString(message)) {
    logger(message);
  } else if (isArray(message)) {
    message.forEach((msg) => logger(msg));
  }
  process.exit(code);
};

module.exports = {
  parseInputList,
  promptEncryptionKey,
  confirmMessage,
  getAuthResolverFor,
  ifOptions,
  exitWith,
};
