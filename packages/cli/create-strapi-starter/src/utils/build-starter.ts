import { resolve, join, basename } from 'path';
import os from 'os';
import fse from 'fs-extra';
import ciEnv from 'ci-info';
import chalk from 'chalk';

import { generateNewApp, type Options as GenerateNewAppOptions } from '@strapi/generate-new';

import { runInstall, runApp, initGit } from './child-process';
import { getStarterPackageInfo, downloadNpmStarter } from './fetch-npm-starter';
import logger from './logger';
import stopProcess from './stop-process';
import type { PackageInfo, PackageManager, StarterOptions } from '../types';
import gitIgnore from '../resources/gitignore';

function readStarterJson(filePath: string, starter: string) {
  try {
    const data = fse.readFileSync(filePath);
    return JSON.parse(data.toString());
  } catch (err) {
    stopProcess(`Could not find ${chalk.yellow('starter.json')} in ${chalk.yellow(starter)}`);
  }
}

const getNpmScript = (dir: string, pkgManager: PackageManager) => {
  switch (pkgManager) {
    case 'yarn':
      return `yarn --cwd ${dir}`;
    case 'pnpm':
      return `pnpm -C ${dir}`;
    default:
      return `npm --prefix ${dir}`;
  }
};

async function initPackageJson(
  rootPath: string,
  projectName: string,
  packageManager: PackageManager
) {
  try {
    await fse.writeJson(
      join(rootPath, 'package.json'),
      {
        name: projectName,
        private: true,
        version: '0.0.0',
        scripts: {
          'develop:backend': `${getNpmScript('backend', packageManager)} run develop`,
          'develop:frontend': `wait-on http://localhost:1337/admin && ${getNpmScript('frontend', packageManager)} run develop`,
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

async function installWithLogs(path: string, packageManager: PackageManager) {
  console.log(`Installing dependencies with ${chalk.bold(packageManager)}\n`);

  await runInstall(path, packageManager);

  console.log(`Dependencies installed ${chalk.green('successfully')}.`);
}

async function getStarterInfo(options: StarterOptions) {
  const { starter, packageManager } = options;

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
    starterPackageInfo = await getStarterPackageInfo(starter, packageManager);
    console.log(`Installing ${chalk.yellow(starterPackageInfo.name)} starter.`);

    // Download starter repository to a temporary directory
    starterParentPath = await fse.mkdtemp(join(os.tmpdir(), 'strapi-'));
    starterPath = await downloadNpmStarter(starterPackageInfo, starterParentPath, packageManager);
  }

  return { isLocalStarter, starterPath, starterParentPath, starterPackageInfo };
}

/**
 * @param {Object} projectArgs - The arguments for create a project
 * @param {string|null} projectArgs.projectName - The name/path of project
 * @param {string|null} projectArgs.starter - The npm package of the starter
 * @param {Object} program - Commands for generating new application
 */
export default async function buildStarter(options: StarterOptions) {
  const { directory, starter } = options;

  const { isLocalStarter, starterPath, starterParentPath, starterPackageInfo } =
    await getStarterInfo(options);

  // Project directory
  const rootPath = resolve(directory);
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
    await fse.copy(join(starterPath, 'starter'), frontendPath, { overwrite: true });
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
  const generateStrapiAppOptions: GenerateNewAppOptions = {
    ...options,
    directory: join(rootPath, 'backend'),
    starter: starterPackageInfo?.name,
    runApp: false,
  };

  if (starterJson.template.version) {
    generateStrapiAppOptions.template = `${starterJson.template.name}@${starterJson.template.version}`;
  } else {
    generateStrapiAppOptions.template = starterJson.template.name;
  }

  // Create strapi app using the template
  await generateNewApp(generateStrapiAppOptions);

  // Install frontend dependencies
  console.log(`Creating Strapi starter frontend at ${chalk.yellow(frontendPath)}.`);
  console.log('Installing frontend dependencies');
  await installWithLogs(frontendPath, options.packageManager);

  // Setup monorepo
  initPackageJson(rootPath, projectBasename, options.packageManager);

  // Add gitignore
  try {
    await fse.writeFile(join(rootPath, '.gitignore'), gitIgnore);
  } catch (err) {
    logger.warn(`Failed to create file: ${chalk.yellow('.gitignore')}`);
  }

  await installWithLogs(rootPath, options.packageManager);

  if (!ciEnv.isCI) {
    await initGit(rootPath);
  }

  console.log(chalk.green('Starting the app'));
  await runApp(rootPath, options.packageManager);
}
