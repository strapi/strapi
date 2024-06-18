/* eslint-disable @typescript-eslint/no-var-requires */
import { join } from 'path';
import fse from 'fs-extra';
import chalk from 'chalk';
import execa from 'execa';

import stopProcess from './utils/stop-process';
import { trackUsage } from './utils/usage';
import mergeTemplate from './utils/merge-template.js';
import tryGitInit from './utils/git';

import createPackageJSON from './resources/json/common/package.json';
import jsconfig from './resources/json/js/jsconfig.json';
import adminTsconfig from './resources/json/ts/tsconfig-admin.json';
import serverTsconfig from './resources/json/ts/tsconfig-server.json';
import { createDatabaseConfig, generateDbEnvVariables } from './resources/templates/database';
import createEnvFile from './resources/templates/env';
import { Scope, isStderrError } from './types';

const resources = join(__dirname, 'resources');

export default async function createProject(scope: Scope) {
  console.log(`Creating a new Strapi application at ${chalk.green(scope.rootPath)}.\n`);

  const { rootPath, useTypescript } = scope;

  if (!scope.isQuickstart) {
    await trackUsage({ event: 'didChooseCustomDatabase', scope });
  } else {
    await trackUsage({ event: 'didChooseQuickstart', scope });
  }

  try {
    const language = useTypescript ? 'ts' : 'js';

    // copy files
    await fse.copy(join(resources, 'files', language), rootPath);

    // copy dot files
    await fse.writeFile(join(rootPath, '.env'), createEnvFile());

    const copyDotFilesFromSubDirectory = (subDirectory: string) => {
      const files = fse.readdirSync(join(resources, 'dot-files', subDirectory));

      return Promise.all(
        files.map((file) => {
          const src = join(resources, 'dot-files', subDirectory, file);
          const dest = join(rootPath, `.${file}`);
          return fse.copy(src, dest);
        })
      );
    };

    // Copy common dot files
    copyDotFilesFromSubDirectory('common');

    await trackUsage({ event: 'didCopyProjectFiles', scope });

    await createPackageJSON(scope);

    await trackUsage({ event: 'didWritePackageJSON', scope });

    if (useTypescript) {
      const tsConfigs = [
        {
          path: 'src/admin/tsconfig.json',
          content: adminTsconfig(),
        },
        {
          path: 'tsconfig.json',
          content: serverTsconfig(),
        },
      ];

      for (const { path, content } of tsConfigs) {
        await fse.writeJSON(join(rootPath, path), content, { spaces: 2 });
      }
    } else {
      await fse.writeJSON(join(rootPath, 'jsconfig.json'), jsconfig(), { spaces: 2 });
    }

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    // create config/database
    await fse.appendFile(join(rootPath, '.env'), generateDbEnvVariables(scope));
    await fse.writeFile(
      join(rootPath, `config/database.${language}`),
      createDatabaseConfig({ useTypescript })
    );

    await trackUsage({ event: 'didCopyConfigurationFiles', scope });

    // merge template files if a template is specified
    const hasTemplate = Boolean(scope.template);
    const hasExampleApp = Boolean(scope.useExampleApp);
    if (hasTemplate || hasExampleApp) {
      try {
        await mergeTemplate(scope, rootPath);
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`⛔️ Template installation failed: ${error.message}`);
        }

        throw error;
      }
    }
  } catch (err) {
    await fse.remove(scope.rootPath);
    throw err;
  }

  await trackUsage({ event: 'willInstallProjectDependencies', scope });

  console.log(`Installing dependencies with ${chalk.bold(scope.packageManager)}\n`);

  try {
    if (scope.installDependencies !== false) {
      await runInstall(scope);
    }

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
    console.log(`cd ${chalk.green(rootPath)} && ${chalk.cyan(scope.packageManager)} install`);
    console.log();

    stopProcess();
  }

  await trackUsage({ event: 'didCreateProject', scope });

  // Init git
  if (await tryGitInit(rootPath)) {
    console.log('Initialized a git repository.');
    console.log();
  }

  console.log();
  console.log(`Your application was created at ${chalk.green(rootPath)}.\n`);

  const cmd = chalk.cyan(`${scope.packageManager} run`);

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
  console.log('You can start by doing:');
  console.log();
  console.log(`  ${chalk.cyan('cd')} ${rootPath}`);
  console.log(`  ${cmd} develop`);
  console.log();

  if (scope.runApp !== true) return;

  console.log(`Running your Strapi application.`);

  try {
    await trackUsage({ event: 'willStartServer', scope });

    await execa('npm', ['run', 'develop'], {
      stdio: 'inherit',
      cwd: scope.rootPath,
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
    process.exit(1);
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
