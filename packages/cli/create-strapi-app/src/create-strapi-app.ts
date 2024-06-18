import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import commander from 'commander';

import { generateNewApp, type Options as GenerateNewAppOptions } from '@strapi/generate-new';

import * as prompts from './prompts';
import type { Options } from './types';
import { detectPackageManager } from './package-manager';
import * as database from './database';
import { handleCloudLogin } from './cloud';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

const command = new commander.Command(packageJson.name);

command
  .version(packageJson.version)
  .arguments('[directory]')
  .usage('[directory] [options]')
  .option('--quickstart', 'Quickstart app creation (deprecated)')
  .option('--no-run', 'Do not start the application after it is created.')

  // setup options
  .option('--ts, --typescript', 'Initialize the project with TypeScript (default)')
  .option('--js, --javascript', 'Initialize the project with Javascript')

  // Package manager options
  .option('--use-npm', 'Use npm as the project package manager')
  .option('--use-yarn', 'Use yarn as the project package manager')
  .option('--use-pnpm', 'Use pnpm as the project package manager')

  // Cloud options
  .option('--skip-cloud', 'Skip cloud login and project creation')

  // Database options
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')

  // templates
  // .option('--template <templateurl>', 'Specify a Strapi template')
  .description('create a new application')
  .action((directory, options) => {
    createStrapiApp(directory, options);
  })
  .parse(process.argv);

async function createStrapiApp(directory: string | undefined, options: Options) {
  validateOptions(options);

  let useExampleApp = false; // Default to false

  if (options.quickstart && !directory) {
    console.error('Please specify the <directory> of your project when using --quickstart');
    process.exit(1);
  }

  const appDirectory = directory || (await prompts.directory());

  if (!options.skipCloud) {
    await handleCloudLogin();
  }

  // Only prompt the example app option if there is no template option
  if (!options.template) {
    useExampleApp = await prompts.example();
  }

  const appOptions = {
    directory: appDirectory,
    useTypescript: true,
    packageManager: 'npm',
    template: options.template,
    isQuickstart: options.quickstart,
    useExampleApp,
  } as GenerateNewAppOptions;

  if (options.javascript === true) {
    appOptions.useTypescript = false;
  } else if (options.typescript === true) {
    appOptions.useTypescript = true;
  } else {
    appOptions.useTypescript = options.quickstart ? true : await prompts.typescript();
  }

  if (options.useNpm === true) {
    appOptions.packageManager = 'npm';
  } else if (options.usePnpm === true) {
    appOptions.packageManager = 'pnpm';
  } else if (options.useYarn === true) {
    appOptions.packageManager = 'yarn';
  } else {
    appOptions.packageManager = detectPackageManager();
  }

  if (options.quickstart === true && options.run !== false) {
    appOptions.runApp = true;
  }

  appOptions.database = await database.getDatabaseInfos(options);

  return generateNewApp(appOptions)
    .then(() => {
      if (process.platform === 'win32') {
        process.exit(0);
      }
    })
    .catch((error: { message: any }) => {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    });
}

async function validateOptions(options: Options) {
  // const programFlags = command
  //   .createHelp()
  //   .visibleOptions(command)
  //   .reduce<Array<string | undefined>>((acc, { short, long }) => [...acc, short, long], [])
  //   .filter(Boolean);

  // if (options.template && programFlags.includes(options.template)) {
  //   console.error(`${options.template} is not a valid template`);
  //   process.exit(1);
  // }

  if (options.javascript === true && options.typescript === true) {
    console.error('You cannot use both --typescript (--ts) and --javascript (--js) flags together');
    process.exit(1);
  }

  if ([options.useNpm, options.usePnpm, options.useYarn].filter(Boolean).length > 1) {
    console.error(
      'You cannot specify multiple package managers at the same time (--use-npm, --use-pnpm, --use-yarn)'
    );
    process.exit(1);
  }

  database.validateOptions(options);
}
