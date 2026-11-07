import { isAbsolute, join, relative, sep } from 'node:path';

import chalk from 'chalk';
import execa from 'execa';
import fse from 'fs-extra';
import ora from 'ora';
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
import {
  CREDENTIALS_FILE,
  createAdminUser,
  ensureCredentialsFileIgnored,
  getAdminTokenSummary,
  getCredentialsFileSummary,
  getGeneratedPasswordSummary,
  getManualAdminCommand,
  writeCredentialsFile,
} from './utils/admin-user';
import type { AdminUser, CreateAdminUserResult, Credentials } from './utils/admin-user';

interface CreateStrapiOptions {
  /** The first admin user. Created only when the dependencies are installed. */
  adminUser?: AdminUser;
  /** Also create an admin token for the admin user. `--no-admin-token` sets it to false. */
  withAdminToken?: boolean;
  /**
   * Print the generated password and the admin token. When false (stdout is not a TTY:
   * CI, Docker builds), they go to the credentials file instead, so build logs never keep them.
   */
  showSecrets?: boolean;
}

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

const shouldWriteYarnNodeModulesConfig = async (packageManager: Scope['packageManager']) => {
  if (packageManager !== 'yarn') {
    return false;
  }

  const userAgentVersion = getUserAgentPackageManagerVersion(packageManager);

  if (userAgentVersion) {
    return semver.gte(userAgentVersion, '3.0.0');
  }

  try {
    const packageManagerVersion = await getPackageManagerVersion(packageManager);
    const normalizedVersion = semver.coerce(packageManagerVersion)?.version;

    return normalizedVersion ? semver.gte(normalizedVersion, '3.0.0') : false;
  } catch {
    return false;
  }
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

async function createStrapi(scope: Scope, options: CreateStrapiOptions = {}) {
  const { rootPath } = scope;
  try {
    await fse.ensureDir(rootPath);
    await createApp(scope, options);
  } catch (error) {
    await fse.remove(rootPath);

    throw error;
  }
}

async function createApp(
  scope: Scope,
  {
    adminUser,
    withAdminToken = true,
    showSecrets = Boolean(process.stdout.isTTY),
  }: CreateStrapiOptions
) {
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
  const scopeWithPnpmVersion = { ...scope, pnpmVersion };

  try {
    await createPackageJSON(scopeWithPnpmVersion);

    await trackUsage({ event: 'didWritePackageJSON', scope });

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    // create config/database
    await fse.writeFile(join(rootPath, '.env'), generateDotEnv(scope));

    if (
      (await shouldWriteYarnNodeModulesConfig(packageManager)) &&
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
    logger.title('deps', `Installing dependencies with ${chalk.cyan(packageManager)}`);

    // The package manager output (warnings, audit, funding) stays hidden unless the install fails
    const spinner = ora({
      text: 'Installing dependencies. This can take a few minutes.',
      indent: 7,
    });

    try {
      await trackUsage({ event: 'willInstallProjectDependencies', scope });

      spinner.start();
      await runInstall(scope);
      spinner.stop();

      await trackUsage({ event: 'didInstallProjectDependencies', scope });

      logger.success(`Dependencies installed`);
    } catch (error) {
      spinner.stop();

      const stderr = isStderrError(error) ? error.stderr : '';
      const output = getInstallOutput(error);

      if (output) {
        console.error(output);
      }

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

  // Before git init: the credentials file must never reach the first commit
  if (installDependencies && adminUser) {
    await ensureCredentialsFileIgnored(rootPath);
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

  let adminResult: CreateAdminUserResult | undefined;

  if (installDependencies && adminUser) {
    adminResult = await runCreateAdminUser({ scope, adminUser, withAdminToken });
  }

  // show the folder relative to where the command ran, not the absolute path
  const projectFolder = getDisplayFolder(relative(process.cwd(), rootPath));

  // In the Admin section, right after the user creation, before "Your application was created!"
  if (adminUser && adminResult?.status === 'created') {
    await showAdminSecrets({
      rootPath,
      projectFolder,
      adminUser,
      adminToken: adminResult.adminToken,
      showSecrets,
    });

    if (withAdminToken && !adminResult.adminToken) {
      logger.warn([
        `The installed ${chalk.bold('@strapi/strapi')} version cannot create an admin token.`,
        'Create one in the admin panel: Settings > Admin tokens.',
      ]);
    }
  }

  const cmd = chalk.cyan(`${packageManager} run`);
  const adminCmd = chalk.cyan(getManualAdminCommand(packageManager, { withAdminToken }));

  logger.title('Strapi', `Your application was created!`);

  if (useExample) {
    logger.log(['Seed your database with sample data.', `${cmd} seed:example`, '']);
  }

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
      adminCmd,
      !shouldRunSeed && useExample ? `${cmd} seed:example && ${cmd} develop` : `${cmd} develop`,
    ]);
  }

  logger.title('Docs', `https://docs.strapi.io/cms`);
  logger.log(['Quick Start Guide : https://docs.strapi.io/cms/quick-start']);

  if (adminResult && adminResult.status !== 'created') {
    // The admin user is mandatory: keep the project, do not start it, and exit with code 1.
    // logger.fatal exits instead of throwing, so createStrapi does not delete the project.
    logger.fatal([
      chalk.bold('Your project was created, but the admin user was not.'),
      '',
      adminResult.status === 'unsupported'
        ? `The installed ${chalk.bold('@strapi/strapi')} version cannot create the admin user non-interactively.`
        : adminResult.error.trim(),
      '',
      'Create the admin user with the following commands:',
      '',
      `${chalk.cyan('cd')} ${projectFolder}`,
      adminCmd,
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

/**
 * Shows the generated password and the admin token once. If stdout is not a TTY, writes them
 * to the credentials file instead and prints only its path.
 */
async function showAdminSecrets({
  rootPath,
  projectFolder,
  adminUser,
  adminToken,
  showSecrets,
}: {
  rootPath: string;
  projectFolder: string;
  adminUser: AdminUser;
  adminToken?: string;
  showSecrets: boolean;
}) {
  const credentials: Credentials = {
    email: adminUser.email,
    ...(adminUser.passwordGenerated && { password: adminUser.password }),
    ...(adminToken && { adminToken }),
  };

  if (credentials.password === undefined && credentials.adminToken === undefined) {
    return;
  }

  if (showSecrets) {
    if (credentials.password !== undefined) {
      logger.log(['', ...getGeneratedPasswordSummary(adminUser)]);
    }

    if (credentials.adminToken !== undefined) {
      logger.log(['', ...getAdminTokenSummary(credentials.adminToken)]);
    }

    return;
  }

  try {
    await writeCredentialsFile(rootPath, credentials);
    logger.log([
      '',
      ...getCredentialsFileSummary(join(projectFolder, CREDENTIALS_FILE), credentials),
    ]);
  } catch (error) {
    // Never fall back to printing the secrets
    logger.warn([
      `The CLI could not write ${chalk.bold(CREDENTIALS_FILE)}: ${error instanceof Error ? error.message : String(error)}`,
      'Reset the admin password with `strapi admin:reset-user-password`,',
      'and create an admin token in the admin panel: Settings > Admin tokens.',
    ]);
  }
}

async function runCreateAdminUser({
  scope,
  adminUser,
  withAdminToken,
}: {
  scope: Scope;
  adminUser: AdminUser;
  withAdminToken: boolean;
}) {
  // Never send the email or the password
  const eventProperties = { passwordGenerated: adminUser.passwordGenerated };

  logger.title('Admin', `Creating the admin user ${chalk.green(adminUser.email)}`);

  await trackUsage({ event: 'willCreateAdminUser', scope, eventProperties });

  const result = await createAdminUser({ rootPath: scope.rootPath, adminUser, withAdminToken });

  if (result.status === 'created') {
    await trackUsage({
      event: 'didCreateAdminUser',
      scope,
      // Never send the token itself
      eventProperties: { ...eventProperties, hasAdminToken: result.adminToken !== undefined },
    });
    logger.success('Admin user created');
  } else {
    await trackUsage({ event: 'didNotCreateAdminUser', scope, eventProperties });
  }

  return result;
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

/**
 * The interleaved stdout and stderr of a failed install, so the user can see the error.
 */
function getInstallOutput(error: unknown) {
  if (typeof error === 'object' && error !== null && 'all' in error) {
    const { all } = error as { all?: unknown };

    return typeof all === 'string' ? all.trim() : '';
  }

  return '';
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
    // Piped, not inherited: the output is shown only if the install fails
    stdio: ['ignore', 'pipe', 'pipe'],
    all: true,
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
