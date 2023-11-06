import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import commander, { CommanderError } from 'commander';

import buildStarter from './utils/build-starter';
import promptUser from './utils/prompt-user';
import type { Program } from './types';

interface ProjectArgs {
  projectName: string;
  starter: string;
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

const program = new commander.Command(packageJson.name);

const incompatibleQuickstartOptions: Array<keyof Program> = [
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
    const projectArgs: ProjectArgs = { projectName: directory, starter };

    initProject(projectArgs, programArgs);
  });

function generateApp(projectArgs: ProjectArgs, programArgs: Program) {
  if (!projectArgs.projectName || !projectArgs.starter) {
    console.error(
      'Please specify the <directory> and <starter> of your project when using --quickstart'
    );
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  return buildStarter(projectArgs, programArgs);
}

async function initProject(projectArgs: ProjectArgs, programArgs: Program) {
  const hasIncompatibleQuickstartOptions = incompatibleQuickstartOptions.some(
    (opt) => programArgs[opt]
  );

  if (programArgs.quickstart && hasIncompatibleQuickstartOptions) {
    console.error(
      `The quickstart option is incompatible with the following options: ${incompatibleQuickstartOptions.join(
        ', '
      )}`
    );
    process.exit(1);
  }

  if (hasIncompatibleQuickstartOptions) {
    programArgs.quickstart = false; // Will disable the quickstart question because != 'undefined'
  }

  const { projectName, starter } = projectArgs;

  if (programArgs.quickstart) {
    return generateApp(projectArgs, programArgs);
  }

  const prompt = await promptUser(projectName, starter, programArgs);

  const promptProjectArgs = {
    projectName: prompt.directory || projectName,
    starter: prompt.starter || starter,
  };

  return generateApp(promptProjectArgs, {
    ...programArgs,
    quickstart: prompt.quick || programArgs.quickstart,
  });
}

try {
  program.parse(process.argv);
} catch (err) {
  if (err instanceof CommanderError) {
    if (err.exitCode && err.exitCode !== 0) {
      program.outputHelp();
    }
  }
}
