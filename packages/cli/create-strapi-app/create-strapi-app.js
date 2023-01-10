'use strict';

const { resolve } = require('path');
const commander = require('commander');
const { checkInstallPath, generateNewApp } = require('@strapi/generate-new');
const promptUser = require('./utils/prompt-user');
// eslint-disable-next-line import/extensions
const packageJson = require('./package.json');

const program = new commander.Command();

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
  .command(packageJson.name)
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
  .action((directory, options) => {
    initProject(directory, program, options);
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

async function initProject(projectName, program, inputOptions) {
  if (projectName) {
    await checkInstallPath(resolve(projectName));
  }

  const programFlags = program.options
    .reduce((acc, { short, long }) => [...acc, short, long], [])
    .filter(Boolean);
  if (inputOptions.template && programFlags.includes(inputOptions.template)) {
    console.error(`${inputOptions.template} is not a valid template`);
    process.exit(1);
  }

  const hasDatabaseOptions = databaseOptions.some((opt) => inputOptions[opt]);

  if (inputOptions.quickstart && hasDatabaseOptions) {
    console.error(
      `The quickstart option is incompatible with the following options: ${databaseOptions.join(
        ', '
      )}`
    );
    process.exit(1);
  }

  if (hasDatabaseOptions) {
    inputOptions.quickstart = false; // Will disable the quickstart question because != 'undefined'
  }

  if (inputOptions.quickstart) {
    return generateApp(projectName, inputOptions);
  }

  const prompt = await promptUser(projectName, inputOptions, hasDatabaseOptions);
  const directory = prompt.directory || projectName;
  await checkInstallPath(resolve(directory));

  const options = {
    template: inputOptions.template,
    quickstart: prompt.quick || inputOptions.quickstart,
  };

  const generateStrapiAppOptions = {
    ...inputOptions,
    ...options,
  };

  return generateApp(directory, generateStrapiAppOptions);
}
