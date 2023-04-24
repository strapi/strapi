'use strict';

/**
 * `$ strapi version`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  // load the Strapi package.json to get version and other information
  const packageJSON = require('../../../../package.json');

  command.version(packageJSON.version, '-v, --version', 'Output the version number');
  command
    .command('version')
    .description('Output the version of Strapi')
    .action(() => {
      process.stdout.write(`${packageJSON.version}\n`);
      process.exit(0);
    });
};
