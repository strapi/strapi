'use strict';

/**
 * Helper functions for the Strapi CLI
 */

const chalk = require('chalk');
const { isString, isArray } = require('lodash/fp');

const bytesPerKb = 1024;
const sizes = ['B ', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Convert bytes to a human readable formatted string, for example "1024" becomes "1KB"
 *
 * @param {number} bytes The bytes to be converted
 * @param {number} decimals How many decimals to include in the final number
 * @param {number} padStart Pad the string with space at the beginning so that it has at least this many characters
 */
const readableBytes = (bytes, decimals = 1, padStart = 0) => {
  if (!bytes) {
    return '0';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(bytesPerKb));
  const result = `${parseFloat((bytes / bytesPerKb ** i).toFixed(decimals))} ${sizes[i].padStart(
    2
  )}`;

  return result.padStart(padStart);
};

/**
 *
 * Display message(s) to console and then call process.exit with code.
 * If code is zero, console.log and green text is used for messages, otherwise console.error and red text.
 *
 * @param {number} code Code to exit process with
 * @param {string | Array} message Message(s) to display before exiting
 * @param {Object} options
 * @param {console} options.logger - logger object, defaults to console
 * @param {process} options.prc - process object, defaults to process
 *
 */
const exitWith = (code, message = undefined, options = {}) => {
  const { logger = console, prc = process } = options;

  const log = (message) => {
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
 * @param {URL} url
 * @param {string[]|string|undefined} [protocol]
 */
const assertUrlHasProtocol = (url, protocol = undefined) => {
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

/**
 * Passes commander options to conditionCallback(). If it returns true, call isMetCallback otherwise call isNotMetCallback
 */
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

module.exports = {
  exitWith,
  assertUrlHasProtocol,
  ifOptions,
  readableBytes,
};
