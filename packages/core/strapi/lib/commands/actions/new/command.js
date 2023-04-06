'use strict';

const { yellow } = require('chalk');

/**
 * `$ strapi new`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('new <directory>')
    .option('--no-run', 'Do not start the application after it is created')
    .option('--use-npm', 'Force usage of npm instead of yarn to create the project')
    .option('--debug', 'Display database connection errors')
    .option('--quickstart', 'Create quickstart app')
    .option('--dbclient <dbclient>', 'Database client')
    .option('--dbhost <dbhost>', 'Database host')
    .option('--dbport <dbport>', 'Database port')
    .option('--dbname <dbname>', 'Database name')
    .option('--dbusername <dbusername>', 'Database username')
    .option('--dbpassword <dbpassword>', 'Database password')
    .option('--dbssl <dbssl>', 'Database SSL')
    .option('--dbfile <dbfile>', 'Database file path for sqlite')
    .option('--dbforce', 'Allow overwriting existing database content')
    .option('-ts, --typescript', 'Create a typescript project')
    .description('Create a new application')
    .hook('preAction', () => {
      console.warn(
        yellow(
          'The `strapi new` command has been deprecated in v4 and will be removed in v5. `create-strapi-app` should be used to create a new Strapi project.'
        )
      );
    })
    .action(require('./action'));
};
