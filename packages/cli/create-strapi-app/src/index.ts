import { join, basename } from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import commander from 'commander';
import crypto from 'crypto';
import fse from 'fs-extra';

import * as prompts from './prompts';
import { handleCloudLogin } from './cloud';
import { createStrapi } from './create-strapi';
import { checkNodeRequirements } from './utils/check-requirements';
import { checkInstallPath } from './utils/check-install-path';
import { machineID } from './utils/machine-id';
import { trackError } from './utils/usage';
import { addDatabaseDependencies, getDatabaseInfos } from './utils/database';

import type { Options, Scope } from './types';
import { logger } from './utils/logger';

const { version } = fse.readJSONSync(join(__dirname, '..', 'package.json'));

const command = new commander.Command('create-strapi-app')
  .version(version)
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

  // dependencies options
  .option('--install', 'Install dependencies')
  .option('--no-install', 'Do not install dependencies')

  // Cloud options
  .option('--skip-cloud', 'Skip cloud login and project creation')

  // Example app
  .option('--example', 'Use an example app')
  .option('--no-example', 'Do not use an example app')

  // git options
  .option('--git-init', 'Initialize a git repository')
  .option('--no-git-init', 'Do no initialize a git repository')

  // Database options
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')
  .option('--skip-db', 'Skip database configuration')

  .option('--template <template>', 'Specify a Strapi template')
  .option('--template-branch <templateBranch>', 'Specify a branch for the template')
  .option('--template-path <templatePath>', 'Specify a path to the template inside the repository')

  .description('create a new application');

async function run(args: string[]): Promise<void> {
  const options = command.parse(args).opts<Options>();
  const directory = command.args[0];

  logger.title(
    'Strapi',
    `${chalk.green(chalk.bold(`v${version}`))} ${chalk.bold("🚀 Let's create your new project")}\n`
  );

  if (
    (options.javascript !== undefined || options.typescript !== undefined) &&
    options.template !== undefined
  ) {
    logger.fatal(
      `You cannot use ${chalk.bold('--javascript')} or ${chalk.bold('--typescript')} with ${chalk.bold('--template')}`
    );
  }

  if (options.javascript === true && options.typescript === true) {
    logger.fatal(
      `You cannot use both ${chalk.bold('--typescript')} (--ts) and ${chalk.bold('--javascript')} (--js) flags together`
    );
  }

  // Only prompt the example app option if there is no template option
  if (options.example === true && options.template !== undefined) {
    logger.fatal(`You cannot use ${chalk.bold('--example')} with ${chalk.bold('--template')}`);
  }

  if (options.template !== undefined && options.template.startsWith('-')) {
    logger.fatal(`Template name ${chalk.bold(`"${options.template}"`)} is invalid`);
  }

  if ([options.useNpm, options.usePnpm, options.useYarn].filter(Boolean).length > 1) {
    logger.fatal(
      `You cannot specify multiple package managers at the same time ${chalk.bold('(--use-npm, --use-pnpm, --use-yarn)')}`
    );
  }

  if (options.quickstart && !directory) {
    logger.fatal(
      `Please specify the ${chalk.bold('<directory>')} of your project when using ${chalk.bold('--quickstart')}`
    );
  }

  checkNodeRequirements();

  const appDirectory = directory || (await prompts.directory());

  const rootPath = await checkInstallPath(appDirectory);

  if (!options.skipCloud) {
    await handleCloudLogin();
  }

  const tmpPath = join(os.tmpdir(), `strapi${crypto.randomBytes(6).toString('hex')}`);

  const scope: Scope = {
    rootPath,
    name: basename(rootPath),
    packageManager: getPkgManager(options),
    database: await getDatabaseInfos(options),
    template: options.template,
    templateBranch: options.templateBranch,
    templatePath: options.templatePath,
    isQuickstart: options.quickstart,
    useExample: false,
    runApp: options.quickstart === true && options.run !== false,
    strapiVersion: version,
    packageJsonStrapi: {
      template: options.template,
    },
    uuid: (process.env.STRAPI_UUID_PREFIX || '') + crypto.randomUUID(),
    docker: process.env.DOCKER === 'true',
    deviceId: machineID(),
    tmpPath,
    gitInit: true,
    devDependencies: {},
    dependencies: {
      '@strapi/strapi': version,
      '@strapi/plugin-users-permissions': version,
      '@strapi/plugin-cloud': version,
      // third party
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      'react-router-dom': '^6.0.0',
      'styled-components': '^6.0.0',
    },
  };

  if (options.template !== undefined) {
    scope.useExample = false;
  } else if (options.example === true) {
    scope.useExample = true;
  } else if (options.example === false || options.quickstart === true) {
    scope.useExample = false;
  } else {
    scope.useExample = await prompts.example();
  }

  if (options.javascript === true) {
    scope.useTypescript = false;
  } else if (options.typescript === true || options.quickstart) {
    scope.useTypescript = true;
  } else if (!options.template) {
    scope.useTypescript = await prompts.typescript();
  }

  if (options.install === true || options.quickstart) {
    scope.installDependencies = true;
  } else if (options.install === false) {
    scope.installDependencies = false;
  } else {
    scope.installDependencies = await prompts.installDependencies(scope.packageManager);
  }

  if (scope.useTypescript) {
    scope.devDependencies = {
      ...scope.devDependencies,
      typescript: '^5',
      '@types/node': '^20',
      '@types/react': '^18',
      '@types/react-dom': '^18',
    };
  }

  if (options.gitInit === true || options.quickstart) {
    scope.gitInit = true;
  } else if (options.gitInit === false) {
    scope.gitInit = false;
  } else {
    scope.gitInit = await prompts.gitInit();
  }

  addDatabaseDependencies(scope);

  try {
    await createStrapi(scope);
  } catch (error: unknown) {
    if (!(error instanceof Error)) {
      throw error;
    }

    await trackError({ scope, error });

    logger.fatal(error.message);
  }
}

function getPkgManager(options: Options) {
  if (options.useNpm === true) {
    return 'npm';
  }

  if (options.usePnpm === true) {
    return 'pnpm';
  }

  if (options.useYarn === true) {
    return 'yarn';
  }

  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.startsWith('yarn')) {
    return 'yarn';
  }

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm';
  }

  return 'npm';
}

export { run, createStrapi };
export type { Scope };
