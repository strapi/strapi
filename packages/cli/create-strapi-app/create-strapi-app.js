'use strict';

const { resolve } = require('path');
const commander = require('commander');
const { checkInstallPath, generateNewApp } = require('@strapi/generate-new');
const promptUser = require('./utils/prompt-user');
// eslint-disable-next-line import/extensions
const packageJson = require('./package.json');

const program = new commander.Command(packageJson.name);

const databaseOptions = [
  'dbclient',
  'dbhost',
  'dbport',
  'dbname',
  'dbusername',
  'dbpassword',
  'dbssl',
  'dbfile',
];

program
  .version(packageJson.version)
  .arguments('[directory]')
  .option('--no-run', 'Do not start the application after it is created')
  .option('--use-npm', 'Force usage of npm instead of yarn to create the project')
  .option('--debug', 'Display database connection error')
  .option('--quickstart', 'Quickstart app creation')
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')
  .option('--dbforce', 'Overwrite database content if any')
  .option('--template <templateurl>', 'Specify a Strapi template')
  .option('--ts, --typescript', 'Use TypeScript to generate the project')
  .description('create a new application')
  .action(directory => {
    initProject(directory, program);
  })
  .parse(process.argv);

function generateApp(projectName, options) {
  if (!projectName) {
    console.error('Please specify the <directory> of your project when using --quickstart');
    process.exit(1);
  }

  return generateNewApp(projectName, options).then(() => {
    if (process.platform === 'win32') {
      process.exit(0);
    }
  });
}

async function initProject(projectName, program) {
  if (projectName) {
    await checkInstallPath(resolve(projectName));
  }

  const hasDatabaseOptions = databaseOptions.some(opt => program[opt]);

  if (program.quickstart && hasDatabaseOptions) {
    console.error(
      `The quickstart option is incompatible with the following options: ${databaseOptions.join(
        ', '
      )}`
    );
    process.exit(1);
  }

  if (hasDatabaseOptions) {
    program.quickstart = false; // Will disable the quickstart question because != 'undefined'
  }

  if (program.quickstart) {
    return generateApp(projectName, program);
  }

  const prompt = await promptUser(projectName, program, hasDatabaseOptions);
  const directory = prompt.directory || projectName;
  await checkInstallPath(resolve(directory));

  const options = {
    template: program.template,
    quickstart: prompt.quick || program.quickstart,
  };

  const generateStrapiAppOptions = {
    ...program,
    ...options,
  };

  return generateApp(directory, generateStrapiAppOptions);
}
