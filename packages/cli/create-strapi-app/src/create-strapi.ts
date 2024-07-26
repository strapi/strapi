import { join } from 'node:path';

import chalk from 'chalk';
import execa from 'execa';
import fse from 'fs-extra';

import { stopProcess } from './utils/stop-process';
import { copyTemplate } from './utils/template';
import { tryGitInit } from './utils/git';
import { trackUsage } from './utils/usage';
import { createPackageJSON } from './utils/package-json';
import { generateDotEnv } from './utils/dot-env';
import { isStderrError } from './types';

import type { Scope } from './types';

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
    useExampleApp,
    installDependencies,
    isQuickstart,
    template,
    packageManager,
    gitInit,
    runApp,
  } = scope;

  await trackUsage({ event: 'willCreateProject', scope });

  console.log(`Creating a new Strapi application at ${chalk.green(rootPath)}.`);

  if (!isQuickstart) {
    await trackUsage({ event: 'didChooseCustomDatabase', scope });
  } else {
    await trackUsage({ event: 'didChooseQuickstart', scope });
  }

  if (!template) {
    let templateName = useExampleApp ? 'example' : 'vanilla';

    if (!useTypescript) {
      templateName = `${templateName}-js`;
    }

    const internalTemplatePath = join(__dirname, '../templates', templateName);
    if (await fse.exists(internalTemplatePath)) {
      await fse.copy(internalTemplatePath, rootPath);
    }
  } else {
    try {
      console.log(`Using template: ${chalk.green(template)}`);
      await copyTemplate(scope, rootPath);
      console.log('Template copied successfully.');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`⛔️ Template installation failed: ${error.message}`);
      }

      throw error;
    }

    if (!fse.existsSync(join(rootPath, 'package.json'))) {
      throw new Error('Missing package.json in template');
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
      await trackUsage({ event: 'willInstallProjectDependencies', scope });
      console.log(`Installing dependencies with ${chalk.bold(packageManager)}\n`);

      await runInstall(scope);

      console.log(`Dependencies installed ${chalk.green('successfully')}.`);
      await trackUsage({ event: 'didInstallProjectDependencies', scope });
    } catch (error) {
      const stderr = isStderrError(error) ? error.stderr : '';

      await trackUsage({
        event: 'didNotInstallProjectDependencies',
        scope,
        error: stderr.slice(-1024),
      });

      console.log(
        chalk.bold(
          'Oh, it seems that you encountered errors while installing dependencies in your project.'
        )
      );
      console.log(`Don't give up, your project was created correctly.`);
      console.log(
        `Fix the issues mentioned in the installation errors and try to run the following command`
      );
      console.log();
      console.log(`cd ${chalk.green(rootPath)} && ${chalk.cyan(packageManager)} install`);
      console.log();

      stopProcess();
    }
  }

  await trackUsage({ event: 'didCreateProject', scope });

  // Init git
  if (gitInit) {
    console.log('Initializing git repository.');
    await tryGitInit(rootPath);
    console.log('Initialized a git repository.');
    console.log();
  }

  console.log();
  console.log(`Your application was created at ${chalk.green(rootPath)}.\n`);

  const cmd = chalk.cyan(`${packageManager} run`);

  console.log('Available commands in your project:');
  console.log();
  console.log(`  ${cmd} develop`);
  console.log(
    '  Start Strapi in watch mode. (Changes in Strapi project files will trigger a server restart)'
  );
  console.log();
  console.log(`  ${cmd} start`);
  console.log('  Start Strapi without watch mode.');
  console.log();
  console.log(`  ${cmd} build`);
  console.log('  Build Strapi admin panel.');
  console.log();
  console.log(`  ${cmd} deploy`);
  console.log('  Deploy Strapi project.');
  console.log();
  console.log(`  ${cmd} strapi`);
  console.log(`  Display all available commands.`);
  console.log();

  if (installDependencies) {
    console.log('You can start by doing:');
    console.log();
    console.log(`  ${chalk.cyan('cd')} ${rootPath}`);
    console.log(`  ${cmd} develop`);
    console.log();
  } else {
    console.log('You can start by doing:');
    console.log();
    console.log(`  ${chalk.cyan('cd')} ${rootPath}`);
    console.log(`  ${chalk.cyan(packageManager)} install`);
    console.log(`  ${cmd} develop`);
    console.log();
  }

  if (runApp && installDependencies) {
    console.log(`Running your Strapi application.`);

    try {
      await trackUsage({ event: 'willStartServer', scope });

      await execa('npm', ['run', 'develop'], {
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

      stopProcess();
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

  return execa(packageManager, installArguments, options);
}

export { createStrapi };
