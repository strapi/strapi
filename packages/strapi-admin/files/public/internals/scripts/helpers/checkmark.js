var chalk = require('chalk');

/**
 * Adds mark check symbol
 */
function addCheckMark(callback) {
  process.stdout.write(chalk.green(' ✓'));
  callback();
}

module.exports = addCheckMark;
