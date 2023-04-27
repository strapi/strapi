import chalk from 'chalk';

export default {
  error(message: string) {
    console.error(`${chalk.red('error')}: ${message}`);
  },

  warn(message: string) {
    console.log(`${chalk.yellow('warning')}: ${message}`);
  },

  info(message: string) {
    console.log(`${chalk.blue('info')}: ${message}`);
  },
};
