import { isAbsolute, join, relative, sep } from 'node:path';

import chalk from 'chalk';
import execa from 'execa';
import fse from 'fs-extra';
import semver from 'semver';

import { createGrowthSsoTrial } from '@strapi/cloud-cli';

import { copyTemplate } from './utils/template';
import { tryGitInit } from './utils/git';
import { trackUsage } from './utils/usage';
import { createPackageJSON } from './utils/package-json';
import { writePnpmWorkspaceConfig } from './utils/pnpm-config';
import { generateDotEnv } from './utils/dot-env';
import { isStderrError } from './types';

import type { Scope } from './types';
import { logger } from './utils/logger';
import { gitIgnore } from './utils/gitignore';
import { getInstallArgs, getPackageManagerVersion } from './utils/get-package-manager-args';

const yarnNodeModulesConfig = 'nodeLinker: node-modules\n';

const getUserAgentPackageManagerVersion = (packageManager: Scope['packageManager']) => {
  const userAgent = process.env.npm_config_user_agent ?? '';
  const [agent] = userAgent.split(' ');
  const [name, version] = agent.split('/');

  if (name !== packageManager || version === undefined) {
    return null;
  }

  return semver.coerce(version)?.version ?? null;
};

/**
 * The version that matters is the `yarn` binary that will install the new app.
 * `yarn --version` from the directory where the command was launched can see a
 * parent project's yarnPath and report Yarn 4 while the app directory's `yarn` is Yarn 1.
 */
export const resolveYarnVersion = async (packageManager: Scope['packageManager'], cwd?: string) => {
  if (packageManager !== 'yarn') {
    return null;
  }

  if (cwd) {
    try {
      const packageManagerVersion = await getPackageManagerVersion(packageManager, { cwd });
      const normalized = semver.coerce(packageManagerVersion)?.version ?? null;

      if (normalized) {
        return normalized;
      }
    } catch {
      // No usable Yarn in the app directory. Fall back to the process that launched the CLI.
    }
  }

  const userAgentVersion = getUserAgentPackageManagerVersion(packageManager);

  if (userAgentVersion) {
    return userAgentVersion;
  }

  try {
    const packageManagerVersion = await getPackageManagerVersion(packageManager);
    return semver.coerce(packageManagerVersion)?.version ?? null;
  } catch {
    return null;
  }
};

const shouldWriteYarnNodeModulesConfig = (yarnVersion: string | null) => {
  const normalized = yarnVersion ? semver.coerce(yarnVersion)?.version : null;

  return normalized ? semver.gte(normalized, '3.0.0') : false;
};

const resolvePnpmVersion = async (packageManager: Scope['packageManager']) => {
  if (packageManager !== 'pnpm') {
    return null;
  }

  const userAgentVersion = getUserAgentPackageManagerVersion(packageManager);

  if (userAgentVersion) {
    return userAgentVersion;
  }

  try {
    return await getPackageManagerVersion(packageManager);
  } catch {
    return null;
  }
};

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

  const pnpmVersion = await resolvePnpmVersion(packageManager);
  const yarnVersion = scope.yarnVersion ?? (await resolveYarnVersion(packageManager, rootPath));
  const scopeWithPnpmVersion = { ...scope, pnpmVersion, yarnVersion };

  try {
    await createPackageJSON(scopeWithPnpmVersion);

    await trackUsage({ event: 'didWritePackageJSON', scope });

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    // create config/database
    await fse.writeFile(join(rootPath, '.env'), generateDotEnv(scope));

    if (
      shouldWriteYarnNodeModulesConfig(yarnVersion) &&
      !(await fse.pathExists(join(rootPath, '.yarnrc.yml')))
    ) {
      await fse.writeFile(join(rootPath, '.yarnrc.yml'), yarnNodeModulesConfig);
    }

    await writePnpmWorkspaceConfig(scopeWithPnpmVersion, pnpmVersion);

    await trackUsage({ event: 'didCopyConfigurationFiles', scope });
  } catch (err) {
    await fse.remove(rootPath);
    throw err;
  }

  // Create and save a growth sso trial license
  if (scope.shouldCreateGrowthSsoTrial) {
    try {
      const data = await createGrowthSsoTrial({ strapiVersion: scope.strapiVersion });

      if (data?.license) {
        fse.writeFile(join(rootPath, 'license.txt'), data.license);
        logger.log('Your 30 days trial will be applied automatically to your project. Enjoy!');
      }
    } catch {
      logger.error('Error while trying to create your trial. Please try again later.');
    }
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
      } catch {
        logger.error('Failed to seed your database. Skipping');
      }
    }
  }

  const cmd = chalk.cyan(`${packageManager} run`);

  logger.title('Strapi', `Your application was created!`);

  if (useExample) {
    logger.log(['Seed your database with sample data.', `${cmd} seed:example`, '']);
  }

  // show the folder relative to where the command ran, not the absolute path
  const projectFolder = getDisplayFolder(relative(process.cwd(), rootPath));

  if (installDependencies) {
    logger.log([
      'To get started run',
      '',
      `${chalk.cyan('cd')} ${projectFolder}`,
      !shouldRunSeed && useExample ? `${cmd} seed:example && ${cmd} develop` : `${cmd} develop`,
    ]);
  } else {
    logger.log([
      'To get started run',
      '',
      `${chalk.cyan('cd')} ${projectFolder}`,
      `${chalk.cyan(packageManager)} install`,
      !shouldRunSeed && useExample ? `${cmd} seed:example && ${cmd} develop` : `${cmd} develop`,
    ]);
  }

  logger.log(['', 'Documentation:', 'Quick Start Guide : https://docs.strapi.io/cms/quick-start']);

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

// prefix child folders with ./ so names like -site or ~site are not read as an option or a home path
function getDisplayFolder(relativeFolder: string) {
  if (!relativeFolder) {
    return '.';
  }

  if (
    isAbsolute(relativeFolder) ||
    relativeFolder === '..' ||
    relativeFolder.startsWith(`..${sep}`)
  ) {
    return relativeFolder;
  }

  return `.${sep}${relativeFolder}`;
}

async function runInstall({ rootPath, packageManager }: Scope) {
  // include same cwd and env to ensure version check returns same version we use below
  const { envArgs, cmdArgs } = await getInstallArgs(packageManager, {
    cwd: rootPath,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  const options: execa.Options = {
    cwd: rootPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...envArgs,
      NODE_ENV: 'development',
    },
  };

  const proc = execa(packageManager, cmdArgs, options);

  return proc;
}

export { createStrapi };
