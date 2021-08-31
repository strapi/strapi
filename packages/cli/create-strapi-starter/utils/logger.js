'use strict';

const chalk = require('chalk');

module.exports = {
  error(message) {
    console.error(`${chalk.red('error')}: ${message}`);
  },

  warn(message) {
    console.log(`${chalk.yellow('warning')}: ${message}`);
  },

  info(message) {
    console.log(`${chalk.blue('info')}: ${message}`);
  },
};
