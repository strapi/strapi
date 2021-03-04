'use strict';

const chalk = require('chalk');
const commander = require('commander');
const PrettyError = require('pretty-error');

const pe = new PrettyError();

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
  .description('Create a new strapi starter application')
  .action((directory, starterUrl, program) => {
    const projectArgs = { projectName: directory, starterUrl };

    buildStarter(projectArgs, program);
  });

// Get all possible options
const options = [];
program.options.forEach(option => {
  options.push(option.long);
  if (option.short) {
    options.push(option.short);
  }
});

// Filter options out of argument check
const args = process.argv.slice(2);
const filteredArgs = args.filter(arg => !options.includes(arg));

// Check correct number of arguments
if (filteredArgs.length !== 2) {
  console.log();
  console.log(
    pe.render(`You provided ${chalk.red(filteredArgs.length)} ${chalk.white('argument(s)')}`)
  );
  console.log(
    `\t ${chalk.white('A starter requires')} ${chalk.green('2')} ${chalk.white('arguments')}`
  );
  console.log(
    `\t ${chalk.white('1.')} ${chalk.yellow(
      'The directory name for your project (i.e. my-project)'
    )}`
  );
  console.log(
    `\t ${chalk.white('2.')} ${chalk.yellow(
      'The GitHub url or shortcut (i.e. gatsby-corporate) for the starter'
    )}`
  );
  console.log();

  program.help();
}

program.parse(process.argv);
