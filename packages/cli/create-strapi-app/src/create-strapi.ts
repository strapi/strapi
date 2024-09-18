import { join } from 'node:path';

import chalk from 'chalk';
import execa from 'execa';
import fse from 'fs-extra';

import { copyTemplate } from './utils/template';
import { tryGitInit } from './utils/git';
import { trackUsage } from './utils/usage';
import { createPackageJSON } from './utils/package-json';
import { generateDotEnv } from './utils/dot-env';
import { isStderrError } from './types';

import type { Scope } from './types';
import { logger } from './utils/logger';
import { gitIgnore } from './utils/gitignore';

async function createStrapi(scope: Scope) {
  const { rootPath } = scope;
  try {
    await fse.ensureDir(rootPath);
    await createApp(scope);
  } catch (error) {
    await fse.remove(rootPath);

    throw error;
  }
}

async function createApp(scope: Scope) {
  const {
    rootPath,
    useTypescript,
    useExample,
    installDependencies,
    isQuickstart,
    template,
    packageManager,
    gitInit,
    runApp,
  } = scope;

  const shouldRunSeed = useExample && installDependencies;

  await trackUsage({ event: 'willCreateProject', scope });

  logger.title('Strapi', `Creating a new application at ${chalk.green(rootPath)}`);

  if (!isQuickstart) {
    await trackUsage({ event: 'didChooseCustomDatabase', scope });
  } else {
    await trackUsage({ event: 'didChooseQuickstart', scope });
  }

  if (!template) {
    let templateName = useExample ? 'example' : 'vanilla';

    if (!useTypescript) {
      templateName = `${templateName}-js`;
    }

    const internalTemplatePath = join(__dirname, '../templates', templateName);
    if (await fse.exists(internalTemplatePath)) {
      await fse.copy(internalTemplatePath, rootPath);
    }
  } else {
    try {
      logger.info(`${chalk.cyan('Installing template')} ${template}`);

      await copyTemplate(scope, rootPath);

      logger.success('Template copied successfully.');
    } catch (error) {
      if (error instanceof Error) {
        logger.fatal(`Template installation failed: ${error.message}`);
      }

      throw error;
    }

    if (!fse.existsSync(join(rootPath, 'package.json'))) {
      logger.fatal(`Missing ${chalk.bold('package.json')} in template`);
    }
  }

  await trackUsage({ event: 'didCopyProjectFiles', scope });

  try {
    await createPackageJSON(scope);

    await trackUsage({ event: 'didWritePackageJSON', scope });

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    // create config/database
    await fse.writeFile(join(rootPath, '.env'), generateDotEnv(scope));

    await trackUsage({ event: 'didCopyConfigurationFiles', scope });
  } catch (err) {
    await fse.remove(rootPath);
    throw err;
  }

  if (installDependencies) {
    try {
      logger.title('deps', `Installing dependencies with ${chalk.cyan(packageManager)}`);

      await trackUsage({ event: 'willInstallProjectDependencies', scope });

      await runInstall(scope);

      await trackUsage({ event: 'didInstallProjectDependencies', scope });

      logger.success(`Dependencies installed`);
    } catch (error) {
      const stderr = isStderrError(error) ? error.stderr : '';

      await trackUsage({
        event: 'didNotInstallProjectDependencies',
        scope,
        error: stderr.slice(-1024),
      });

      logger.fatal([
        chalk.bold(
          'Oh, it seems that you encountered an error while installing dependencies in your project'
        ),
        '',
        `Don't give up, your project was created correctly`,
        '',
        `Fix the issues mentioned in the installation errors and try to run the following command:`,
        '',
        `cd ${chalk.green(rootPath)} && ${chalk.cyan(packageManager)} install`,
      ]);
    }
  }

  await trackUsage({ event: 'didCreateProject', scope });

  // make sure a gitignore file is created regardless of the user using git or not
  if (!(await fse.exists(join(rootPath, '.gitignore')))) {
    await fse.writeFile(join(rootPath, '.gitignore'), gitIgnore);
  }

  // Init git
  if (gitInit) {
    logger.title('git', 'Initializing git repository.');

    await tryGitInit(rootPath);

    logger.success('Initialized a git repository.');
  }

  if (shouldRunSeed) {
    if (await fse.exists(join(rootPath, 'scripts/seed.js'))) {
      logger.title('Seed', 'Seeding your database with sample data');

      try {
        await execa(packageManager, ['run', 'seed:example'], {
          stdio: 'inherit',
          cwd: rootPath,
        });
        logger.success('Sample data added to your database');
      } catch (error) {
        logger.error('Failed to seed your database. Skipping');
      }
    }
  }

  const cmd = chalk.cyan(`${packageManager} run`);

  logger.title('Strapi', `Your application was created!`);

  logger.log([
    'Available commands in your project:',
    '',
    'Start Strapi in watch mode. (Changes in Strapi project files will trigger a server restart)',
    `${cmd} develop`,
    '',
    'Start Strapi without watch mode.',
    `${cmd} start`,
    '',
    'Build Strapi admin panel.',
    `${cmd} build`,
    '',
    'Deploy Strapi project.',
    `${cmd} deploy`,
    '',
  ]);

  if (useExample) {
    logger.log(['Seed your database with sample data.', `${cmd} seed:example`, '']);
  }

  logger.log(['Display all available commands.', `${cmd} strapi\n`]);

  if (installDependencies) {
    logger.log([
      'To get started run',
      '',
      `${chalk.cyan('cd')} ${rootPath}`,
      !shouldRunSeed && useExample ? `${cmd} seed:example && ${cmd} develop` : `${cmd} develop`,
    ]);
  } else {
    logger.log([
      'To get started run',
      '',
      `${chalk.cyan('cd')} ${rootPath}`,
      `${chalk.cyan(packageManager)} install`,
      !shouldRunSeed && useExample ? `${cmd} seed:example && ${cmd} develop` : `${cmd} develop`,
    ]);
  }

  if (runApp && installDependencies) {
    logger.title('Run', 'Running your Strapi application');

    try {
      await trackUsage({ event: 'willStartServer', scope });

      await execa(packageManager, ['run', 'develop'], {
        stdio: 'inherit',
        cwd: rootPath,
        env: {
          FORCE_COLOR: '1',
        },
      });
    } catch (error) {
      if (typeof error === 'string' || error instanceof Error) {
        await trackUsage({
          event: 'didNotStartServer',
          scope,
          error,
        });
      }

      logger.fatal('Failed to start your Strapi application');
    }
  }
}

const installArguments = ['install'];

const installArgumentsMap = {
  npm: ['--legacy-peer-deps'],
  yarn: ['--network-timeout 1000000'],
  pnpm: [],
};

function runInstall({ rootPath, packageManager }: Scope) {
  const options: execa.Options = {
    cwd: rootPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  };

  if (packageManager in installArgumentsMap) {
    installArguments.push(...(installArgumentsMap[packageManager] ?? []));
  }

  const proc = execa(packageManager, installArguments, options);

  return proc;
}

export { createStrapi };
