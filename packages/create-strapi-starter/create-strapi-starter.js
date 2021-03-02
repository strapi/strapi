'use strict';

const commander = require('commander');
const packageJson = require('./package.json');
const buildStarter = require('./utils/build-starter');

const program = new commander.Command(packageJson.name);

program
  .version(packageJson.version)
  .arguments('<directory> <starterurl>')
  .option('--use-npm', 'Force usage of npm instead of yarn to create the project')
  .option('--debug', 'Display database connection error')
  .option('--quickstart', 'Quickstart app creation')
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbsrv <dbsrv>', 'Database srv')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbauth <dbauth>', 'Authentication Database')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')
  .option('--dbforce', 'Overwrite database content if any')
  .description('create a new strapi starter application')
  .action((directory, starterUrl, program) => {
    const projectArgs = { projectName: directory, starterUrl };

    buildStarter(projectArgs, program);
  });

// Show help if not enough arguments are present
if (process.argv.length < 4) {
  program.help();
}

program.parse(process.argv);
