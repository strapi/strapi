import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import commander from 'commander';

import buildStarter from './utils/build-starter';
import * as prompts from './prompts';
import * as database from './database';
import type { Options, StarterOptions } from './types';
import { detectPackageManager } from './package-manager';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

const command = new commander.Command(packageJson.name);

command
  .version(packageJson.version)
  .arguments('[directory], [starter]')
  .usage('[directory] [starter] [options]')
  .option('--quick, --quickstart', 'Quickstart app creation')

  // setup options
  .option('--ts, --typescript', 'Initialize the project with TypeScript (default)')
  .option('--js, --javascript', 'Initialize the project with Javascript')

  // Package manager options
  .option('--use-npm', 'Use npm as the project package manager')
  .option('--use-yarn', 'Use yarn as the project package manager')
  .option('--use-pnpm', 'Use pnpm as the project package manager')

  // Database options
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')
  .description(
    'Create a fullstack monorepo application using the strapi backend template specified in the provided starter'
  )
  .action((directory, starter, options) => {
    createStrapiStarter(directory, starter, options);
  })
  .parse(process.argv);

async function createStrapiStarter(
  directory: string | undefined,
  starter: string | undefined,
  options: Options
) {
  validateOptions(options);

  if (options.quickstart && (!directory || !starter)) {
    console.error(
      'Please specify the <directory> and <starter> of your project when using --quickstart'
    );

    process.exit(1);
  }

  const appDirectory = directory || (await prompts.directory());
  const appStarter = starter || (await prompts.starter());

  const appOptions = {
    directory: appDirectory,
    starter: appStarter,
    useTypescript: true,
    packageManager: 'npm',
    isQuickstart: options.quickstart,
  } as StarterOptions;

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

  if (options.quickstart === true) {
    appOptions.runApp = true;
  }

  appOptions.database = await database.getDatabaseInfos(options);

  return buildStarter(appOptions)
    .then(() => {
      if (process.platform === 'win32') {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    });
}

async function validateOptions(options: Options) {
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
