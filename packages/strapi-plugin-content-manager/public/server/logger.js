/* eslint-disable no-console */

const chalk = require('chalk');
const ip = require('ip');

const divider = chalk.gray('\n-----------------------------------');

/**
 * Logger middleware, you can customize it to make messages more personal
 */
const logger = {

  // Called whenever there's an error on the server we want to print
  error: (err) => {
    console.error(chalk.red(err));
  },

  // Called when express.js app starts on given port w/o errors
  appStarted: (port) => {
    console.log(`Strapi plugin succesfully started in development mode. ${chalk.green('✓')}`);

    console.log(`
${chalk.bold('Access URL:')}${divider}
Localhost: ${chalk.magenta(`http://localhost:${port}`)}
${chalk.blue(`Press ${chalk.italic('CTRL-C')} to stop`)}
    `);
  },
};

module.exports = logger;
