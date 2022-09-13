'use strict';

const commander = require('commander');

// eslint-disable-next-line import/extensions
const packageJson = require('./package.json');
const buildStarter = require('./utils/build-starter');
const promptUser = require('./utils/prompt-user');

const program = new commander.Command(packageJson.name);

const incompatibleQuickstartOptions = [
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
  .arguments('[directory], [starter]')
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
  .description(
    'Create a fullstack monorepo application using the strapi backend template specified in the provided starter'
  )
  .action((directory, starter, programArgs) => {
    const projectArgs = { projectName: directory, starter };

    initProject(projectArgs, programArgs);
  });

function generateApp(projectArgs, programArgs) {
  if (!projectArgs.projectName || !projectArgs.starter) {
    console.error(
      'Please specify the <directory> and <starter> of your project when using --quickstart'
    );
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  return buildStarter(projectArgs, programArgs);
}

async function initProject(projectArgs, program) {
  const hasIncompatibleQuickstartOptions = incompatibleQuickstartOptions.some(
    (opt) => program[opt]
  );

  if (program.quickstart && hasIncompatibleQuickstartOptions) {
    console.error(
      `The quickstart option is incompatible with the following options: ${incompatibleQuickstartOptions.join(
        ', '
      )}`
    );
    process.exit(1);
  }

  if (hasIncompatibleQuickstartOptions) {
    program.quickstart = false; // Will disable the quickstart question because != 'undefined'
  }

  const { projectName, starter } = projectArgs;

  if (program.quickstart) {
    return generateApp(projectArgs, program);
  }

  const prompt = await promptUser(projectName, starter, program);

  const promptProjectArgs = {
    projectName: prompt.directory || projectName,
    starter: prompt.starter || starter,
  };

  const programArgs = {
    ...program,
    quickstart: prompt.quick || program.quickstart,
  };

  return generateApp(promptProjectArgs, programArgs);
}

try {
  program.parse(process.argv);
} catch (err) {
  if (err.exitCode && err.exitCode !== 0) {
    program.outputHelp();
  }
}
