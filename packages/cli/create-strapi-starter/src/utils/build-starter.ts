import { resolve, join, basename } from 'path';
import os from 'os';
import fse from 'fs-extra';
import ora from 'ora';
import ciEnv from 'ci-info';
import chalk from 'chalk';

import { generateNewApp } from '@strapi/generate-new';

import hasYarn from './has-yarn';
import { runInstall, runApp, initGit } from './child-process';
import { getStarterPackageInfo, downloadNpmStarter } from './fetch-npm-starter';
import logger from './logger';
import stopProcess from './stop-process';
import type { Options, PackageInfo, Program } from '../types';

function readStarterJson(filePath: string, starter: string) {
  try {
    const data = fse.readFileSync(filePath);
    return JSON.parse(data.toString());
  } catch (err) {
    stopProcess(`Could not find ${chalk.yellow('starter.json')} in ${chalk.yellow(starter)}`);
  }
}

async function initPackageJson(rootPath: string, projectName: string, { useYarn }: Options = {}) {
  const packageManager = useYarn ? 'yarn --cwd' : 'npm run --prefix';

  try {
    await fse.writeJson(
      join(rootPath, 'package.json'),
      {
        name: projectName,
        private: true,
        version: '0.0.0',
        scripts: {
          'develop:backend': `${packageManager} backend develop`,
          'develop:frontend': `wait-on http://localhost:1337/admin && ${packageManager} frontend develop`,
          develop: 'cross-env FORCE_COLOR=1 npm-run-all -l -p develop:*',
        },
        devDependencies: {
          'npm-run-all': '4.1.5',
          'wait-on': '5.2.1',
          'cross-env': '7.0.3',
        },
      },
      {
        spaces: 2,
      }
    );
  } catch (err) {
    stopProcess(`Failed to create ${chalk.yellow('package.json')} in ${chalk.yellow(rootPath)}`);
  }
}

async function installWithLogs(path: string, options: Options) {
  const installPrefix = chalk.yellow('Installing dependencies:');
  const loader = ora(installPrefix).start();
  const logInstall = (chunk = '') => {
    loader.text = `${installPrefix} ${chunk.toString().split('\n').join(' ')}`;
  };

  const runner = runInstall(path, options);
  runner.stdout?.on('data', logInstall);
  runner.stderr?.on('data', logInstall);

  await runner;

  loader.stop();
  console.log(`Dependencies installed ${chalk.green('successfully')}.`);
}

async function getStarterInfo(starter: string, { useYarn }: Options = {}) {
  const isLocalStarter = ['./', '../', '/'].some((filePrefix) => starter.startsWith(filePrefix));

  let starterPath;
  let starterParentPath;
  let starterPackageInfo: PackageInfo | undefined;

  if (isLocalStarter) {
    // Starter is a local directory
    console.log('Installing local starter.');
    starterPath = resolve(starter);
  } else {
    // Starter should be an npm package. Fetch starter info
    starterPackageInfo = await getStarterPackageInfo(starter, { useYarn });
    console.log(`Installing ${chalk.yellow(starterPackageInfo.name)} starter.`);

    // Download starter repository to a temporary directory
    starterParentPath = await fse.mkdtemp(join(os.tmpdir(), 'strapi-'));
    starterPath = await downloadNpmStarter(starterPackageInfo, starterParentPath, { useYarn });
  }

  return { isLocalStarter, starterPath, starterParentPath, starterPackageInfo };
}

/**
 * @param {Object} projectArgs - The arguments for create a project
 * @param {string|null} projectArgs.projectName - The name/path of project
 * @param {string|null} projectArgs.starter - The npm package of the starter
 * @param {Object} program - Commands for generating new application
 */
export default async function buildStarter(
  { projectName, starter }: { projectName: string; starter: string },
  program: Program
) {
  const hasYarnInstalled = hasYarn();
  const { isLocalStarter, starterPath, starterParentPath, starterPackageInfo } =
    await getStarterInfo(starter, { useYarn: hasYarnInstalled });

  // Project directory
  const rootPath = resolve(projectName);
  const projectBasename = basename(rootPath);
  const starterJson = readStarterJson(join(starterPath, 'starter.json'), starter);

  try {
    await fse.ensureDir(rootPath);
  } catch (error) {
    if (error instanceof Error) {
      stopProcess(`Failed to create ${chalk.yellow(rootPath)}: ${error.message}`);
    }

    stopProcess(`Failed to create ${chalk.yellow(rootPath)}: ${error}`);
  }

  // Copy the downloaded frontend folder to the project folder
  const frontendPath = join(rootPath, 'frontend');

  try {
    await fse.copy(join(starterPath, 'starter'), frontendPath, {
      overwrite: true,
      recursive: true,
    });
  } catch (error) {
    if (error instanceof Error) {
      stopProcess(`Failed to create ${chalk.yellow(frontendPath)}: ${error.message}`);
    }

    stopProcess(`Failed to create ${chalk.yellow(frontendPath)}`);
  }

  // Delete the starter directory if it was downloaded
  if (!isLocalStarter && starterParentPath) {
    await fse.remove(starterParentPath);
  }

  // Set command options for Strapi app
  const generateStrapiAppOptions = {
    ...program,
    starter: starterPackageInfo?.name,
    run: false,
  };
  if (starterJson.template.version) {
    generateStrapiAppOptions.template = `${starterJson.template.name}@${starterJson.template.version}`;
  } else {
    generateStrapiAppOptions.template = starterJson.template.name;
  }

  // Create strapi app using the template
  await generateNewApp(join(rootPath, 'backend'), generateStrapiAppOptions);

  // Install frontend dependencies
  console.log(`Creating Strapi starter frontend at ${chalk.yellow(frontendPath)}.`);
  console.log('Installing frontend dependencies');
  await installWithLogs(frontendPath, { useYarn: hasYarnInstalled });

  // Setup monorepo
  initPackageJson(rootPath, projectBasename, { useYarn: hasYarnInstalled });

  // Add gitignore
  try {
    const gitignore = join(__dirname, '..', 'resources', 'gitignore');
    await fse.copy(gitignore, join(rootPath, '.gitignore'));
  } catch (err) {
    logger.warn(`Failed to create file: ${chalk.yellow('.gitignore')}`);
  }

  await installWithLogs(rootPath, { useYarn: hasYarnInstalled });

  if (!ciEnv.isCI) {
    await initGit(rootPath);
  }

  console.log(chalk.green('Starting the app'));
  await runApp(rootPath, { useYarn: hasYarnInstalled });
}
