'use strict';

const chalk = require('chalk');

/**
 * @typedef {{ silent?: boolean; debug?: boolean; timestamp?: boolean; }} LoggerOptions
 */

/**
 * @typedef {object} Logger
 * @property {number} warnings
 * @property {number} errors
 * @property {(...args: any[]) => void} debug
 * @property {(...args: any[]) => void} info
 * @property {(...args: any[]) => void} warn
 * @property {(...args: any[]) => void} error
 * @property {(...args: any[]) => void} log
 */

/**
 * @type {(options: LoggerOptions) => Logger}
 */
const createLogger = (options = {}) => {
  const { silent = false, debug = false, timestamp = true } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(
        chalk.cyan(`[DEBUG]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(
        chalk.blue(`[INFO]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    log(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`${timestamp ? `\t[${new Date().toISOString()}]` : ''}`), ...args);
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(
        chalk.yellow(`[WARN]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(
        chalk.red(`[ERROR]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },
  };
};

module.exports = {
  createLogger,
};
