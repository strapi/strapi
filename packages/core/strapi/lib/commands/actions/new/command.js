'use strict';

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi new`
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
    .action(require('./action'));
};
