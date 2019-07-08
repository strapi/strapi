'use strict';

const commander = require('commander');
const packageJson = require('./package.json');
const generateNewApp = require('strapi-generate-new');

const program = new commander.Command(packageJson.name);

let projectName;

program
  .version(packageJson.version)
  .arguments('<directory>')
  .option('--no-run', 'Do not start the application after it is created')
  .option(
    '--use-npm',
    'Force usage of npm instead of yarn to create the project'
  )
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
  .description('create a new application')
  .action(directory => {
    projectName = directory;
  })
  .parse(process.argv);

if (projectName === undefined) {
  console.error('Please specify the <directory> of your project');
  process.exit(1);
}

generateNewApp(projectName, program);
